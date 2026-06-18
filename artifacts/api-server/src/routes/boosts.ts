import { Router, type IRouter } from "express";
import { db, adBoostsTable, businessesTable, transactionsTable } from "@workspace/db";
import { eq, and, desc, lte } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { validateBody } from "../lib/validation";

const router: IRouter = Router();

const PAYSTACK_SECRET = process.env["PAYSTACK_SECRET_KEY"] ?? "";
const PAYSTACK_BASE = "https://api.paystack.co";

const BOOST_TIERS = {
  basic:   { label: "Basic",   pricePerWeek: 50,  featuredType: "search_boost",     badge: "Boosted",   description: "Appear higher in search results" },
  pro:     { label: "Pro",     pricePerWeek: 150, featuredType: "homepage_section",  badge: "Featured",  description: "Featured section on the homepage" },
  premium: { label: "Premium", pricePerWeek: 400, featuredType: "homepage_top",      badge: "Top Pick",  description: "Top banner placement on homepage" },
} as const;

type BoostTier = keyof typeof BOOST_TIERS;

async function paystackPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { status: boolean; data: T; message: string };
  if (!res.ok || !data.status) throw new Error(data.message ?? "Paystack error");
  return data.data;
}

async function expireStaleBoosts(businessId: number): Promise<void> {
  const now = new Date();
  const expired = await db
    .select({ id: adBoostsTable.id })
    .from(adBoostsTable)
    .where(and(eq(adBoostsTable.businessId, businessId), eq(adBoostsTable.isActive, true), lte(adBoostsTable.expiresAt, now)));

  if (expired.length > 0) {
    await db
      .update(adBoostsTable)
      .set({ isActive: false, updatedAt: now })
      .where(and(eq(adBoostsTable.businessId, businessId), eq(adBoostsTable.isActive, true), lte(adBoostsTable.expiresAt, now)));

    await db
      .update(businessesTable)
      .set({ isFeatured: false, featuredType: null, featuredUntil: null, updatedAt: now })
      .where(eq(businessesTable.id, businessId));
  }
}

const InitBoostSchema = z.object({
  tier: z.enum(["basic", "pro", "premium"]),
  durationDays: z.number().int().min(7).max(28).default(7),
});

const VerifyBoostSchema = z.object({
  reference: z.string().min(1),
  boostId: z.number().int().positive(),
});

// GET /api/boosts/tiers — public info on tiers
router.get("/boosts/tiers", (_req, res): void => {
  res.json(
    Object.entries(BOOST_TIERS).map(([key, t]) => ({
      id: key,
      label: t.label,
      pricePerWeek: t.pricePerWeek,
      badge: t.badge,
      description: t.description,
    }))
  );
});

// GET /api/boosts/my — current boost status for the seller's business
router.get("/boosts/my", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, req.userId!));

  if (!business) {
    res.json({ active: null, history: [] });
    return;
  }

  await expireStaleBoosts(business.id);

  const [activeBoost] = await db
    .select()
    .from(adBoostsTable)
    .where(and(eq(adBoostsTable.businessId, business.id), eq(adBoostsTable.isActive, true)))
    .limit(1);

  const history = await db
    .select()
    .from(adBoostsTable)
    .where(eq(adBoostsTable.businessId, business.id))
    .orderBy(desc(adBoostsTable.createdAt))
    .limit(20);

  const [freshBusiness] = await db
    .select({ isFeatured: businessesTable.isFeatured, featuredType: businessesTable.featuredType, featuredUntil: businessesTable.featuredUntil })
    .from(businessesTable)
    .where(eq(businessesTable.id, business.id));

  res.json({
    businessId: business.id,
    active: activeBoost ?? null,
    isFeatured: freshBusiness?.isFeatured ?? false,
    featuredType: freshBusiness?.featuredType ?? null,
    featuredUntil: freshBusiness?.featuredUntil ?? null,
    history,
  });
});

// POST /api/boosts/initialize — create pending boost record for inline popup payment
// Frontend opens Paystack popup with PUBLIC KEY; on success calls /api/boosts/verify
router.post("/boosts/initialize", requireAuth, validateBody(InitBoostSchema), async (req: AuthRequest, res): Promise<void> => {
  const { tier, durationDays } = req.body;

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, req.userId!));

  if (!business) {
    res.status(404).json({ error: "No business found. Please list your business first." });
    return;
  }

  const tierInfo = BOOST_TIERS[tier as BoostTier];
  const weeks = durationDays / 7;
  const amountGHS = tierInfo.pricePerWeek * weeks;
  const amountPesewas = Math.round(amountGHS * 100);
  const reference = `BOOST-${business.id}-${Date.now()}`;

  const [boost] = await db
    .insert(adBoostsTable)
    .values({
      businessId: business.id,
      tier: tier,
      durationDays: durationDays,
      amount: amountGHS.toString(),
      currency: "GHS",
      paymentRef: reference,
      paymentStatus: "pending",
      isActive: false,
    })
    .returning();

  await db.insert(transactionsTable).values({
    userId: req.userId!,
    type: "payment",
    amount: amountGHS.toString(),
    currency: "GHS",
    provider: "paystack",
    providerRef: reference,
    channel: "card",
    status: "pending",
    metadata: { boostId: boost.id, businessId: business.id, tier: tier },
  });

  res.json({ reference, amountPesewas, boostId: boost.id });
});

// POST /api/boosts/verify — verify payment and activate boost
router.post("/boosts/verify", requireAuth, validateBody(VerifyBoostSchema), async (req: AuthRequest, res): Promise<void> => {
  const { boostId, reference } = req.body;

  const [boost] = await db.select().from(adBoostsTable).where(eq(adBoostsTable.id, boostId));
  if (!boost) { res.status(404).json({ error: "Boost not found" }); return; }

  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, boost.businessId));
  if (!business || business.ownerId !== req.userId) {
    res.status(403).json({ error: "Not your business" });
    return;
  }

  if (boost.paymentStatus === "paid" && boost.isActive) {
    res.json({ boost, already: true });
    return;
  }

  if (PAYSTACK_SECRET) {
    try {
      const response = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(parsed.data.reference)}`, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      });
      const data = (await response.json()) as { status: boolean; data: { status: string } };
      if (!data.status || data.data.status !== "success") {
        res.status(402).json({ error: "Payment not confirmed yet. Please complete payment first." });
        return;
      }
    } catch {
      res.status(502).json({ error: "Could not reach payment gateway" });
      return;
    }
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + boost.durationDays * 24 * 60 * 60 * 1000);

  await db
    .update(adBoostsTable)
    .set({ isActive: false, updatedAt: now })
    .where(and(eq(adBoostsTable.businessId, boost.businessId), eq(adBoostsTable.isActive, true)));

  const [updatedBoost] = await db
    .update(adBoostsTable)
    .set({ paymentStatus: "paid", isActive: true, startsAt: now, expiresAt, updatedAt: now })
    .where(eq(adBoostsTable.id, boost.id))
    .returning();

  const featuredTypeMap: Record<string, string> = {
    basic: "search_boost",
    pro: "homepage_section",
    premium: "homepage_top",
  };

  await db
    .update(businessesTable)
    .set({ isFeatured: true, featuredType: featuredTypeMap[boost.tier] ?? "search_boost", featuredUntil: expiresAt, updatedAt: now })
    .where(eq(businessesTable.id, boost.businessId));

  await db
    .update(transactionsTable)
    .set({ status: "success", updatedAt: now })
    .where(eq(transactionsTable.providerRef, parsed.data.reference));

  res.json({ boost: updatedBoost, expiresAt });
});

// POST /api/boosts/webhook — Paystack webhook for boost payments
router.post("/boosts/webhook", async (req, res): Promise<void> => {
  const event = req.body as {
    event: string;
    data: { reference: string; status: string; metadata?: { boostId?: number } };
  };

  if (event.event === "charge.success" && event.data.metadata?.boostId) {
    const boostId = event.data.metadata.boostId;
    const [boost] = await db.select().from(adBoostsTable).where(eq(adBoostsTable.id, boostId));

    if (boost && boost.paymentStatus !== "paid") {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + boost.durationDays * 24 * 60 * 60 * 1000);
      const featuredTypeMap: Record<string, string> = { basic: "search_boost", pro: "homepage_section", premium: "homepage_top" };

      await db
        .update(adBoostsTable)
        .set({ isActive: false, updatedAt: now })
        .where(and(eq(adBoostsTable.businessId, boost.businessId), eq(adBoostsTable.isActive, true)));

      await db
        .update(adBoostsTable)
        .set({ paymentStatus: "paid", isActive: true, startsAt: now, expiresAt, updatedAt: now })
        .where(eq(adBoostsTable.id, boostId));

      await db
        .update(businessesTable)
        .set({ isFeatured: true, featuredType: featuredTypeMap[boost.tier] ?? "search_boost", featuredUntil: expiresAt, updatedAt: now })
        .where(eq(businessesTable.id, boost.businessId));

      await db
        .update(transactionsTable)
        .set({ status: "success", updatedAt: now })
        .where(eq(transactionsTable.providerRef, event.data.reference));
    }
  }

  res.sendStatus(200);
});

export default router;
