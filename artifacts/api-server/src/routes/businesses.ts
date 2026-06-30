import { Router, type IRouter } from "express";
import { db, businessesTable, reviewsTable, ordersTable } from "@workspace/db";
import { eq, ilike, and, or, isNull, SQL, sql, desc, gt } from "drizzle-orm";
import { z } from "zod";
import {
  CreateBusinessBody,
  UpdateBusinessBody,
  GetBusinessParams,
  UpdateBusinessParams,
  DeleteBusinessParams,
  GetBusinessesQueryParams,
  VerifyBusinessBody,
  VerifyBusinessParams,
} from "@workspace/api-zod";
import { requireAuth, requireVerified, type AuthRequest } from "../lib/auth-middleware";
import { logAdminAction } from "../lib/log-admin-action";
import { sendAdminEmail } from "../lib/mailer";

const router: IRouter = Router();

// Paystack Helper for server-side requests
import { paystackPost } from "./payments";

const SettlementBody = z.object({
  type: z.enum(["momo", "nuban"]),
  name: z.string().min(1),
  account_number: z.string().min(1),
  bank_code: z.string().min(1),
});

// Helper to select all business fields + review stats
const bizWithStats = {
  id: businessesTable.id,
  ownerId: businessesTable.ownerId,
  name: businessesTable.name,
  category: businessesTable.category,
  description: businessesTable.description,
  location: businessesTable.location,
  phone: businessesTable.phone,
  logo: businessesTable.logo,
  images: businessesTable.images,
  isVerified: businessesTable.isVerified,
  isFeatured: businessesTable.isFeatured,
  featuredType: businessesTable.featuredType,
  featuredUntil: businessesTable.featuredUntil,
  createdAt: businessesTable.createdAt,
  updatedAt: businessesTable.updatedAt,
  avgRating: sql<number>`coalesce(round(avg(${reviewsTable.rating})::numeric,1),0)::float`,
  reviewCount: sql<number>`count(distinct ${reviewsTable.id})::int`,
};

// Reusable expiry check: isFeatured=true AND (featuredUntil IS NULL OR featuredUntil > now)
function featuredActiveCondition() {
  return and(
    eq(businessesTable.isFeatured, true),
    or(
      isNull(businessesTable.featuredUntil),
      gt(businessesTable.featuredUntil, sql`now()`)
    )
  );
}

router.get("/businesses", async (req, res): Promise<void> => {
  const query = GetBusinessesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { search, category, verified } = query.data;

  const conditions: SQL[] = [];
  if (search) conditions.push(ilike(businessesTable.name, `%${search}%`));
  if (category && category !== "All") conditions.push(eq(businessesTable.category, category));
  if (verified === "true") conditions.push(eq(businessesTable.isVerified, true));

  // Sort search_boost + active featured businesses first
  const searchBoostSort = sql`case when ${businessesTable.isFeatured} = true and ${businessesTable.featuredType} = 'search_boost' and (${businessesTable.featuredUntil} is null or ${businessesTable.featuredUntil} > now()) then 0 else 1 end`;
  const businesses =
    conditions.length > 0
      ? await db.select().from(businessesTable).where(and(...conditions))
          .orderBy(searchBoostSort, desc(businessesTable.createdAt))
      : await db.select().from(businessesTable)
          .orderBy(searchBoostSort, desc(businessesTable.createdAt));

  res.json(businesses);
});

// Featured brands — homepage_section type, with expiry
router.get("/businesses/featured", async (_req, res): Promise<void> => {
  const businesses = await db
    .select()
    .from(businessesTable)
    .where(
      and(
        featuredActiveCondition(),
        eq(businessesTable.featuredType, "homepage_section")
      )
    )
    .limit(8);
  res.json(businesses);
});

// Featured top — homepage_top type, with expiry
router.get("/businesses/featured-top", async (_req, res): Promise<void> => {
  const businesses = await db
    .select()
    .from(businessesTable)
    .where(
      and(
        featuredActiveCondition(),
        eq(businessesTable.featuredType, "homepage_top")
      )
    )
    .limit(6);
  res.json(businesses);
});

// Top verified brands sorted by order count + review stats
router.get("/businesses/top", async (_req, res): Promise<void> => {
  const rows = await db
    .select(bizWithStats)
    .from(businessesTable)
    .leftJoin(reviewsTable, eq(reviewsTable.businessId, businessesTable.id))
    .leftJoin(ordersTable, eq(ordersTable.businessId, businessesTable.id))
    .where(eq(businessesTable.isVerified, true))
    .groupBy(businessesTable.id)
    .orderBy(
      sql`count(distinct ${ordersTable.id}) desc`,
      desc(businessesTable.createdAt)
    )
    .limit(8);
  res.json(rows);
});

// Trending brands: most activity in last 30 days
router.get("/businesses/trending", async (_req, res): Promise<void> => {
  const rows = await db
    .select(bizWithStats)
    .from(businessesTable)
    .leftJoin(reviewsTable, eq(reviewsTable.businessId, businessesTable.id))
    .leftJoin(
      ordersTable,
      and(
        eq(ordersTable.businessId, businessesTable.id),
        sql`${ordersTable.createdAt} > now() - interval '30 days'`
      )
    )
    .groupBy(businessesTable.id)
    .orderBy(
      sql`count(distinct ${ordersTable.id}) desc`,
      desc(businessesTable.createdAt)
    )
    .limit(8);
  res.json(rows);
});

// Verified sellers with review stats
router.get("/businesses/verified", async (_req, res): Promise<void> => {
  const rows = await db
    .select(bizWithStats)
    .from(businessesTable)
    .leftJoin(reviewsTable, eq(reviewsTable.businessId, businessesTable.id))
    .where(eq(businessesTable.isVerified, true))
    .groupBy(businessesTable.id)
    .orderBy(
      sql`coalesce(round(avg(${reviewsTable.rating})::numeric,1),0) desc`,
      desc(businessesTable.createdAt)
    )
    .limit(12);
  res.json(rows);
});

router.get("/businesses/:id", async (req, res): Promise<void> => {
  const params = GetBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, params.data.id));

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  res.json(business);
});

router.post("/businesses", requireAuth, requireVerified, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [business] = await db
    .insert(businessesTable)
    .values({
      ...parsed.data,
      // Force ownership to the authenticated user — never trust client-provided ownerId.
      ownerId: req.userId!,
      images: parsed.data.images ?? [],
    })
    .returning();

  sendAdminEmail(
    "New Business Onboarded",
    `A new business has been added to Nafex Hub and may need verification.\n\nBusiness: ${business.name}\nCategory: ${business.category}\nLocation: ${business.location}\nDate: ${new Date().toUTCString()}`
  );

  res.status(201).json(business);
});

router.put("/businesses/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = UpdateBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select({ ownerId: businessesTable.ownerId })
    .from(businessesTable)
    .where(eq(businessesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  if (existing.ownerId !== req.userId && req.user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = UpdateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [business] = await db
    .update(businessesTable)
    .set(parsed.data)
    .where(eq(businessesTable.id, params.data.id))
    .returning();

  res.json(business);
});

// Add payout settlement details
router.post("/businesses/:id/settlement", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = UpdateBusinessParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  
  const parsed = SettlementBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(businessesTable).where(eq(businessesTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Business not found" }); return; }
  if (existing.ownerId !== req.userId) { res.status(403).json({ error: "Unauthorized" }); return; }

  try {
    const paystackRes = await paystackPost<{ recipient_code: string }>("/transferrecipient", {
      type: parsed.data.type,
      name: parsed.data.name,
      account_number: parsed.data.account_number,
      bank_code: parsed.data.bank_code,
      currency: "GHS",
    });

    const [updated] = await db
      .update(businessesTable)
      .set({
        paystackRecipientCode: paystackRes.recipient_code,
        settlementBank: parsed.data.bank_code,
        settlementAccount: parsed.data.account_number,
      })
      .where(eq(businessesTable.id, params.data.id))
      .returning();

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.delete("/businesses/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DeleteBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select({ ownerId: businessesTable.ownerId })
    .from(businessesTable)
    .where(eq(businessesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  if (existing.ownerId !== req.userId && req.user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(businessesTable).where(eq(businessesTable.id, params.data.id));
  res.sendStatus(204);
});

router.delete("/admin/business/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const params = DeleteBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [business] = await db
    .delete(businessesTable)
    .where(eq(businessesTable.id, params.data.id))
    .returning();

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  await logAdminAction({
    adminId: req.user!.id,
    adminName: req.user!.name,
    action: "delete_business",
    targetType: "business",
    targetId: String(business.id),
    details: { businessName: business.name },
  });

  res.sendStatus(204);
});

// Admin: set featured status, type and expiry
router.patch("/admin/businesses/:id/featured", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const params = GetBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = z.object({
    isFeatured: z.boolean(),
    featuredType: z.enum(["homepage_top", "homepage_section", "search_boost"]).optional().nullable(),
    featuredUntil: z.string().datetime().optional().nullable(),
  }).safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: "isFeatured required" });
    return;
  }

  const updateData: Record<string, unknown> = { isFeatured: body.data.isFeatured };
  if (!body.data.isFeatured) {
    // Clear featured fields when disabling
    updateData.featuredType = null;
    updateData.featuredUntil = null;
  } else {
    if (body.data.featuredType !== undefined) updateData.featuredType = body.data.featuredType;
    if (body.data.featuredUntil !== undefined) {
      updateData.featuredUntil = body.data.featuredUntil ? new Date(body.data.featuredUntil) : null;
    }
  }

  const [business] = await db
    .update(businessesTable)
    .set(updateData)
    .where(eq(businessesTable.id, params.data.id))
    .returning();

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  await logAdminAction({
    adminId: req.user!.id,
    adminName: req.user!.name,
    action: body.data.isFeatured ? "feature_business" : "unfeature_business",
    targetType: "business",
    targetId: String(business.id),
    details: { businessName: business.name, featuredType: body.data.featuredType, featuredUntil: body.data.featuredUntil },
  });

  res.json(business);
});

router.patch("/businesses/:id/verify", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = VerifyBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = VerifyBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [business] = await db
    .update(businessesTable)
    .set({ isVerified: parsed.data.isVerified })
    .where(eq(businessesTable.id, params.data.id))
    .returning();

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  if (req.user?.role === "admin") {
    await logAdminAction({
      adminId: req.user.id,
      adminName: req.user.name,
      action: parsed.data.isVerified ? "verify_business" : "unverify_business",
      targetType: "business",
      targetId: String(business.id),
      details: { businessName: business.name },
    });
  }

  res.json(business);
});

export default router;
