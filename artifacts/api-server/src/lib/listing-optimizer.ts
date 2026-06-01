import OpenAI from "openai";

export type ListingInput = {
  name: string;
  description?: string;
  price?: string;
  category?: string;
};

export type ListingSuggestion = {
  name: string;
  description: string;
  tips: string[];
  source: "ai" | "rules";
};

function ruleBasedOptimize(input: ListingInput): ListingSuggestion {
  const rawName = input.name.trim();
  const category = input.category?.trim() ?? "product";
  const price = input.price ? `GHS ${input.price}` : "";

  const name =
    rawName.length >= 8
      ? rawName.charAt(0).toUpperCase() + rawName.slice(1)
      : `${rawName} — Premium ${category}`;

  const bullets = [
    price ? `Price: ${price}` : null,
    "Condition: Brand new / as described",
    "Delivery: Available across Ghana (confirm zone with seller)",
    "Payment: Secured via Nafex escrow until you confirm delivery",
  ].filter(Boolean) as string[];

  const description = [
    input.description?.trim() || `Quality ${category.toLowerCase()} from a verified Nafex seller.`,
    "",
    "What's included:",
    ...bullets.map((b) => `• ${b}`),
    "",
    "Why buy on Nafex:",
    "• Escrow-protected checkout",
    "• Verified sellers & dispute support",
    "• Fast local delivery options",
  ].join("\n");

  const tips: string[] = [];
  if (!input.description || input.description.trim().length < 40) {
    tips.push("Add size, colour, material, and what is included in the box.");
  }
  if (!input.price) tips.push("Set a clear price — buyers filter by budget.");
  if (rawName.length < 12) tips.push("Use a specific title (brand + model + key detail).");
  if (!/\d/.test(rawName)) tips.push("Include numbers where relevant (size, capacity, quantity).");
  tips.push("Upload at least 3 clear photos on a plain background.");

  return { name, description, tips, source: "rules" };
}

export async function optimizeListing(input: ListingInput): Promise<ListingSuggestion> {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) return ruleBasedOptimize(input);

  try {
    const client = new OpenAI({ apiKey });
    const res = await client.chat.completions.create({
      model: process.env["OPENAI_MODEL"] ?? "gpt-4o-mini",
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You help Ghanaian marketplace sellers write product listings for Nafex Hub. " +
            "Return JSON: { \"name\": string, \"description\": string, \"tips\": string[] }. " +
            "Use GHS for currency. Keep descriptions scannable with short paragraphs and bullet points. " +
            "Mention escrow safety briefly. Max 5 tips.",
        },
        {
          role: "user",
          content: JSON.stringify({
            name: input.name,
            description: input.description ?? "",
            price: input.price ?? "",
            category: input.category ?? "",
          }),
        },
      ],
    });

    const text = res.choices[0]?.message?.content;
    if (!text) return ruleBasedOptimize(input);

    const parsed = JSON.parse(text) as {
      name?: string;
      description?: string;
      tips?: string[];
    };

    if (!parsed.name || !parsed.description) return ruleBasedOptimize(input);

    return {
      name: parsed.name.slice(0, 120),
      description: parsed.description.slice(0, 2000),
      tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 5) : [],
      source: "ai",
    };
  } catch {
    return ruleBasedOptimize(input);
  }
}
