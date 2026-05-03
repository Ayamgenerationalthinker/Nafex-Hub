import { Router, type IRouter } from "express";
import { db, businessesTable, usersTable, ordersTable, conversationsTable } from "@workspace/db";
import { eq, sql, ilike, and, SQL } from "drizzle-orm";
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

export default router;
