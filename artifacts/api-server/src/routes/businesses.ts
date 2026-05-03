import { Router, type IRouter } from "express";
import { db, businessesTable, reviewsTable, ordersTable } from "@workspace/db";
import { eq, ilike, and, SQL, sql, desc } from "drizzle-orm";
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
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { logAdminAction } from "../lib/log-admin-action";
import { sendAdminEmail } from "../lib/mailer";

const router: IRouter = Router();

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
  createdAt: businessesTable.createdAt,
  updatedAt: businessesTable.updatedAt,
  avgRating: sql<number>`coalesce(round(avg(${reviewsTable.rating})::numeric,1),0)::float`,
  reviewCount: sql<number>`count(distinct ${reviewsTable.id})::int`,
};

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

  const businesses =
    conditions.length > 0
      ? await db.select().from(businessesTable).where(and(...conditions))
      : await db.select().from(businessesTable);

  res.json(businesses);
});

// Featured brands (admin-curated isFeatured=true)
router.get("/businesses/featured", async (_req, res): Promise<void> => {
  const businesses = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.isFeatured, true))
    .limit(8);
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

router.post("/businesses", async (req, res): Promise<void> => {
  const parsed = CreateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [business] = await db
    .insert(businessesTable)
    .values({
      ...parsed.data,
      images: parsed.data.images ?? [],
    })
    .returning();

  sendAdminEmail(
    "New Business Onboarded",
    `A new business has been added to Nafex Hub and may need verification.\n\nBusiness: ${business.name}\nCategory: ${business.category}\nLocation: ${business.location}\nDate: ${new Date().toUTCString()}`
  );

  res.status(201).json(business);
});

router.put("/businesses/:id", async (req, res): Promise<void> => {
  const params = UpdateBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  res.json(business);
});

router.delete("/businesses/:id", async (req, res): Promise<void> => {
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

// Admin: toggle isFeatured
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

  const body = z.object({ isFeatured: z.boolean() }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "isFeatured required" });
    return;
  }

  const [business] = await db
    .update(businessesTable)
    .set({ isFeatured: body.data.isFeatured })
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
    details: { businessName: business.name },
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
