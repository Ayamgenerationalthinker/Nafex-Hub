import { Router, type IRouter } from "express";
import { db, favoritesTable, businessesTable, productsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

const ToggleBody = z.object({
  businessId: z.number().int().positive().optional(),
  productId: z.number().int().positive().optional(),
});

// GET /favorites
router.get("/favorites", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const favs = await db
    .select()
    .from(favoritesTable)
    .where(eq(favoritesTable.userId, userId));

  const businessIds = favs.filter(f => f.businessId).map(f => f.businessId!);
  const productIds = favs.filter(f => f.productId).map(f => f.productId!);

  const [businesses, products] = await Promise.all([
    businessIds.length
      ? db.select().from(businessesTable).where(inArray(businessesTable.id, businessIds))
      : Promise.resolve([]),
    productIds.length
      ? db
          .select({
            id: productsTable.id,
            businessId: productsTable.businessId,
            name: productsTable.name,
            description: productsTable.description,
            price: productsTable.price,
            images: productsTable.images,
            createdAt: productsTable.createdAt,
            updatedAt: productsTable.updatedAt,
            businessName: businessesTable.name,
            businessLogo: businessesTable.logo,
          })
          .from(productsTable)
          .leftJoin(businessesTable, eq(productsTable.businessId, businessesTable.id))
          .where(inArray(productsTable.id, productIds))
      : Promise.resolve([]),
  ]);

  res.json({ businesses, products, favoriteIds: favs.map(f => ({ id: f.id, businessId: f.businessId, productId: f.productId })) });
});

// POST /favorites - toggle (add if not exists, remove if exists)
router.post("/favorites/toggle", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = ToggleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  if (!parsed.data.businessId && !parsed.data.productId) {
    res.status(400).json({ error: "businessId or productId required" });
    return;
  }

  const userId = req.userId!;
  const { businessId, productId } = parsed.data;

  const existing = await db
    .select()
    .from(favoritesTable)
    .where(
      businessId
        ? and(eq(favoritesTable.userId, userId), eq(favoritesTable.businessId, businessId))
        : and(eq(favoritesTable.userId, userId), eq(favoritesTable.productId, productId!))
    );

  if (existing.length > 0) {
    await db.delete(favoritesTable).where(eq(favoritesTable.id, existing[0].id));
    res.json({ favorited: false, id: existing[0].id });
  } else {
    const [fav] = await db
      .insert(favoritesTable)
      .values({ userId, businessId: businessId ?? null, productId: productId ?? null })
      .returning();
    res.json({ favorited: true, id: fav.id });
  }
});

export default router;
