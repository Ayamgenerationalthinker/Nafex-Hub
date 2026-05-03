import { Router, type IRouter } from "express";
import { db, businessesTable } from "@workspace/db";
import { eq, sql, ilike, and, SQL } from "drizzle-orm";
import { GetAdminBusinessesQueryParams } from "@workspace/api-zod";

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

  res.json({
    totalBusinesses: totalResult?.count ?? 0,
    verifiedBusinesses: verifiedResult?.count ?? 0,
    totalCategories: categoriesResult.length,
    featuredBrands: verifiedResult?.count ?? 0,
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
