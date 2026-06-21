import { Router, type IRouter } from "express";
import { db, businessesTable, usersTable, ordersTable, conversationsTable, analyticsEventsTable } from "@workspace/db";
import { eq, sql, ilike, and, or, isNull, gt, SQL } from "drizzle-orm";
import { GetAdminBusinessesQueryParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const result = await db
    .select({
      category: businessesTable.category,
      count: sql<number>`count(*)::int`,
    })
    .from(businessesTable)
    .groupBy(businessesTable.category);

  res.json(result);
});

router.get("/stats/summary", async (_req, res): Promise<void> => {
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(businessesTable);

  const [verifiedResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(businessesTable)
    .where(eq(businessesTable.isVerified, true));

  const categoriesResult = await db
    .select({ category: businessesTable.category })
    .from(businessesTable)
    .groupBy(businessesTable.category);

  const [featuredResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(businessesTable)
    .where(eq(businessesTable.isFeatured, true));

  res.json({
    totalBusinesses: totalResult?.count ?? 0,
    verifiedBusinesses: verifiedResult?.count ?? 0,
    totalCategories: categoriesResult.length,
    featuredBrands: featuredResult?.count ?? 0,
  });
});

router.get("/admin/stats", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [[usersResult], [totalBiz], [verifiedBiz], [ordersResult], [convResult]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(usersTable),
    db.select({ count: sql<number>`count(*)::int` }).from(businessesTable),
    db.select({ count: sql<number>`count(*)::int` }).from(businessesTable).where(eq(businessesTable.isVerified, true)),
    db.select({ count: sql<number>`count(*)::int` }).from(ordersTable),
    db.select({ count: sql<number>`count(*)::int` }).from(conversationsTable),
  ]);

  res.json({
    totalUsers: usersResult?.count ?? 0,
    totalBusinesses: totalBiz?.count ?? 0,
    verifiedBusinesses: verifiedBiz?.count ?? 0,
    totalOrders: ordersResult?.count ?? 0,
    totalMessages: convResult?.count ?? 0,
  });
});

router.get("/admin/businesses", async (req, res): Promise<void> => {
  const query = GetAdminBusinessesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { search, category, verified } = query.data;

  const conditions: SQL[] = [];
  if (search) conditions.push(ilike(businessesTable.name, `%${search}%`));
  if (category && category !== "All") conditions.push(eq(businessesTable.category, category));
  if (verified === "true") conditions.push(eq(businessesTable.isVerified, true));
  if (verified === "false") conditions.push(eq(businessesTable.isVerified, false));

  const businesses =
    conditions.length > 0
      ? await db.select().from(businessesTable).where(and(...conditions))
      : await db.select().from(businessesTable);

  res.json(businesses);
});

// Admin: featured ads performance — active placements + 30-day engagement
router.get("/admin/featured-analytics", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Fetch all currently isFeatured businesses (including expired ones for the table)
  const featuredBizRows = await db
    .select({
      id: businessesTable.id,
      name: businessesTable.name,
      logo: businessesTable.logo,
      featuredType: businessesTable.featuredType,
      featuredUntil: businessesTable.featuredUntil,
    })
    .from(businessesTable)
    .where(eq(businessesTable.isFeatured, true));

  if (!featuredBizRows.length) {
    res.json({ summary: [], businesses: [] });
    return;
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  // Fetch analytics events for these businesses in last 30 days
  const bizIds = featuredBizRows.map(b => b.id);
  const events = await db
    .select({
      businessId: analyticsEventsTable.businessId,
      type: analyticsEventsTable.type,
    })
    .from(analyticsEventsTable)
    .where(
      and(
        sql`${analyticsEventsTable.businessId} = ANY(${sql`ARRAY[${sql.join(bizIds.map(id => sql`${id}`), sql`, `)}]::int[]`})`,
        gt(analyticsEventsTable.createdAt, since)
      )
    );

  // Aggregate per business
  const statsMap = new Map<number, { views: number; messages: number; orders: number }>();
  for (const biz of featuredBizRows) statsMap.set(biz.id, { views: 0, messages: 0, orders: 0 });
  for (const ev of events) {
    const s = statsMap.get(ev.businessId);
    if (!s) continue;
    if (ev.type === "view") s.views++;
    else if (ev.type === "message") s.messages++;
    else if (ev.type === "order") s.orders++;
  }

  const businesses = featuredBizRows.map(biz => ({
    ...biz,
    featuredUntil: biz.featuredUntil ? biz.featuredUntil.toISOString() : null,
    ...(statsMap.get(biz.id) ?? { views: 0, messages: 0, orders: 0 }),
  }));

  // Summary counts — only active (not expired)
  const now = new Date();
  const activeTypes = ["homepage_top", "homepage_section", "search_boost"] as const;
  const summary = activeTypes.map(type => ({
    type,
    count: featuredBizRows.filter(b =>
      b.featuredType === type && (!b.featuredUntil || b.featuredUntil > now)
    ).length,
  }));

  res.json({ summary, businesses });
});

export default router;
