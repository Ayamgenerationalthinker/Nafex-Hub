import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { db, productsTable, businessesTable } from "@workspace/db";
import { and, ilike, or, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ?? "",
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"] ?? undefined,
});

const SearchBody = z.object({
  query: z.string().min(2).max(200),
});

// In-memory rate limit: 10 requests / minute per IP.
// AI endpoint is public and each call hits paid OpenAI, so throttle to
// prevent cost-exhaustion / DoS. Sliding window.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const rateBuckets = new Map<string, number[]>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const hits = (rateBuckets.get(ip) ?? []).filter(t => t > cutoff);
  if (hits.length >= RATE_MAX) {
    const retryAfter = Math.ceil((hits[0] + RATE_WINDOW_MS - now) / 1000);
    rateBuckets.set(ip, hits);
    return { allowed: false, retryAfter };
  }
  hits.push(now);
  rateBuckets.set(ip, hits);
  // Opportunistic GC: drop cold IPs every so often.
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) {
      const fresh = v.filter(t => t > cutoff);
      if (fresh.length === 0) rateBuckets.delete(k);
      else rateBuckets.set(k, fresh);
    }
  }
  return { allowed: true, retryAfter: 0 };
}

const FiltersSchema = z.object({
  keywords: z.array(z.string()).default([]),
  category: z.string().nullable().default(null),
  minPrice: z.number().nullable().default(null),
  maxPrice: z.number().nullable().default(null),
  verifiedOnly: z.boolean().default(false),
  explanation: z.string().default(""),
});

router.post("/search/ai", async (req, res): Promise<void> => {
  const ip = (req.headers["x-forwarded-for"]?.toString().split(",")[0].trim()) || req.ip || "unknown";
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    res.setHeader("Retry-After", String(rl.retryAfter));
    res.status(429).json({ error: `Too many AI searches. Try again in ${rl.retryAfter}s.` });
    return;
  }

  const parsed = SearchBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { query } = parsed.data;

  // Step 1: ask OpenAI to parse intent into structured filters.
  let filters: z.infer<typeof FiltersSchema>;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are a search-intent parser for a Ghanaian marketplace called Nafex Hub.",
            "Given a natural-language shopping query, extract structured filters.",
            "Prices are in Ghanaian Cedis (GHS). Convert any spoken price (e.g. '500 cedis', 'under 500', 'around 200') to numbers.",
            "Respond with ONLY a JSON object matching this schema:",
            `{
  "keywords": string[],         // 1-5 short search keywords from the query (product name, color, material, brand, etc.)
  "category": string | null,     // one of: Clothing, Footwear, Accessories, Jewelry & Watches, Bags & Luggage, Fabric & Textiles, Food & Drinks, Electronics, Phones & Gadgets, Furniture, Beauty & Skincare, Hair & Wigs, Health & Wellness, Sports & Fitness, Toys & Games, Other — or null if unclear
  "minPrice": number | null,
  "maxPrice": number | null,
  "verifiedOnly": boolean,      // true if user asks for trusted/verified/legit sellers
  "explanation": string         // one short sentence explaining what you're searching for
}`,
            "Examples:",
            "'red kente dress under 500' → {\"keywords\":[\"red\",\"kente\",\"dress\"],\"category\":\"Clothing\",\"maxPrice\":500,\"minPrice\":null,\"verifiedOnly\":false,\"explanation\":\"Looking for red kente dresses under GHS 500.\"}",
            "'cheap iphone from verified seller' → {\"keywords\":[\"iphone\"],\"category\":\"Phones & Gadgets\",\"maxPrice\":null,\"minPrice\":null,\"verifiedOnly\":true,\"explanation\":\"Affordable iPhones from verified sellers.\"}",
          ].join("\n"),
        },
        { role: "user", content: query },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const json = JSON.parse(raw) as unknown;
    filters = FiltersSchema.parse(json);
  } catch (err) {
    req.log?.error({ err }, "AI search intent parse failed");
    // Fall back: treat the query as plain keywords.
    filters = { keywords: query.split(/\s+/).slice(0, 5), category: null, minPrice: null, maxPrice: null, verifiedOnly: false, explanation: "Plain keyword search (AI parser unavailable)." };
  }

  // Step 2: build SQL conditions from filters.
  const conds: SQL[] = [];
  if (filters.keywords.length > 0) {
    const wordConds = filters.keywords.map(k =>
      or(ilike(productsTable.name, `%${k}%`), ilike(productsTable.description, `%${k}%`))
    ).filter((c): c is SQL => Boolean(c));
    if (wordConds.length > 0) {
      const combined = or(...wordConds);
      if (combined) conds.push(combined);
    }
  }
  if (filters.category) conds.push(ilike(businessesTable.category, `%${filters.category}%`));
  if (filters.minPrice != null) conds.push(gte(productsTable.price, String(filters.minPrice)));
  if (filters.maxPrice != null) conds.push(lte(productsTable.price, String(filters.maxPrice)));
  if (filters.verifiedOnly) conds.push(eq(businessesTable.isVerified, true));

  const where = conds.length > 0 ? and(...conds) : undefined;

  const products = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      discountPrice: productsTable.discountPrice,
      images: productsTable.images,
      businessId: businessesTable.id,
      businessName: businessesTable.name,
      businessLogo: businessesTable.logo,
      businessVerified: businessesTable.isVerified,
    })
    .from(productsTable)
    .innerJoin(businessesTable, eq(businessesTable.id, productsTable.businessId))
    .where(where ?? sql`true`)
    .limit(30);

  res.json({ filters, products, count: products.length });
});

export default router;
