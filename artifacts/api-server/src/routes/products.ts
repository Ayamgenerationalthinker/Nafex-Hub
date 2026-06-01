import { Router, type IRouter } from "express";
import { db, productsTable, businessesTable, favoritesTable, collectionsTable, reviewsTable } from "@workspace/db";
import { and, desc, eq, ilike, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, optionalAuth, type AuthRequest } from "../lib/auth-middleware";
import { logAdminAction } from "../lib/log-admin-action";
import { optimizeListing } from "../lib/listing-optimizer";

const router: IRouter = Router();

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const BusinessIdParam = z.object({ businessId: z.coerce.number().int().positive() });

const CreateBody = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  discountPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  images: z.array(z.string()).default([]),
  stock: z.number().int().min(0).nullable().optional(),
  collectionId: z.number().int().positive().nullable().optional(),
});

const UpdateStockBody = z.object({
  stock: z.number().int().min(0).nullable(),
});

// GET /admin/products - admin view of all products with business info, search + pagination
router.get("/admin/products", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  const where = search ? ilike(productsTable.name, `%${search}%`) : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(where);

  const rows = await db
    .select({
      id: productsTable.id,
      businessId: productsTable.businessId,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      images: productsTable.images,
      stock: productsTable.stock,
      createdAt: productsTable.createdAt,
      businessName: businessesTable.name,
      businessLogo: businessesTable.logo,
    })
    .from(productsTable)
    .leftJoin(businessesTable, eq(productsTable.businessId, businessesTable.id))
    .where(where)
    .orderBy(desc(productsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    products: rows,
    total: count,
    page,
    pages: Math.max(1, Math.ceil(count / limit)),
  });
});

// DELETE /admin/product/:id - admin force-remove any product
router.delete("/admin/product/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }

  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [product] = await db
    .delete(productsTable)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  await logAdminAction({
    adminId: req.user!.id,
    adminName: req.user!.name,
    action: "delete_product",
    targetType: "product",
    targetId: String(product.id),
    details: { productName: product.name, businessId: product.businessId },
  });

  res.sendStatus(204);
});

// GET /products/discounted — all products with an active discount price
router.get("/products/discounted", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: productsTable.id,
      businessId: productsTable.businessId,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      discountPrice: productsTable.discountPrice,
      images: productsTable.images,
      stock: productsTable.stock,
      createdAt: productsTable.createdAt,
      businessName: businessesTable.name,
      businessLogo: businessesTable.logo,
    })
    .from(productsTable)
    .leftJoin(businessesTable, eq(productsTable.businessId, businessesTable.id))
    .where(
      and(
        isNotNull(productsTable.discountPrice),
        sql`${productsTable.discountPrice}::numeric < ${productsTable.price}::numeric`
      )
    )
    .orderBy(desc(productsTable.updatedAt));

  res.json(rows);
});

// GET /products - list all with optional search
router.get("/products", async (req, res): Promise<void> => {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  const rows = await db
    .select({
      id: productsTable.id,
      businessId: productsTable.businessId,
      collectionId: productsTable.collectionId,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      discountPrice: productsTable.discountPrice,
      images: productsTable.images,
      stock: productsTable.stock,
      createdAt: productsTable.createdAt,
      updatedAt: productsTable.updatedAt,
      businessName: businessesTable.name,
      businessLogo: businessesTable.logo,
    })
    .from(productsTable)
    .leftJoin(businessesTable, eq(productsTable.businessId, businessesTable.id))
    .where(search ? ilike(productsTable.name, `%${search}%`) : undefined)
    .orderBy(productsTable.createdAt)
    .limit(limit)
    .offset(offset);

  res.json(rows);
});

// POST /products/optimize-listing — AI-assisted title & description (seller)
router.post("/products/optimize-listing", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const body = z
    .object({
      name: z.string().min(1),
      description: z.string().optional(),
      price: z.string().optional(),
      category: z.string().optional(),
      businessId: z.number().int().positive().optional(),
    })
    .safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (body.data.businessId) {
    const [biz] = await db
      .select({ ownerId: businessesTable.ownerId, category: businessesTable.category })
      .from(businessesTable)
      .where(eq(businessesTable.id, body.data.businessId));

    if (!biz || (biz.ownerId !== req.userId && req.user?.role !== "admin")) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const suggestion = await optimizeListing({
      name: body.data.name,
      description: body.data.description,
      price: body.data.price,
      category: body.data.category ?? biz.category,
    });
    res.json(suggestion);
    return;
  }

  const suggestion = await optimizeListing(body.data);
  res.json(suggestion);
});

// GET /businesses/:businessId/products
router.get("/businesses/:businessId/products", async (req, res): Promise<void> => {
  const params = BusinessIdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.businessId, params.data.businessId))
    .orderBy(productsTable.createdAt);

  res.json(rows);
});

// GET /products/:id
router.get("/products/:id", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(404).json({ error: "Not found" }); return; }

  const [product] = await db
    .select({
      id: productsTable.id,
      businessId: productsTable.businessId,
      collectionId: productsTable.collectionId,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      discountPrice: productsTable.discountPrice,
      images: productsTable.images,
      stock: productsTable.stock,
      createdAt: productsTable.createdAt,
      updatedAt: productsTable.updatedAt,
      businessName: businessesTable.name,
      businessLogo: businessesTable.logo,
      isVerified: businessesTable.isVerified,
    })
    .from(productsTable)
    .leftJoin(businessesTable, eq(productsTable.businessId, businessesTable.id))
    .where(eq(productsTable.id, params.data.id));

  if (!product) { res.status(404).json({ error: "Not found" }); return; }

  // Check if favorited by current user
  let isFavorited = false;
  if (req.userId) {
    const [fav] = await db
      .select()
      .from(favoritesTable)
      .where(
        sql`${favoritesTable.userId} = ${req.userId} AND ${favoritesTable.productId} = ${params.data.id}`
      );
    isFavorited = !!fav;
  }

  const [ratingStats] = await db
    .select({
      avgRating: sql<number>`coalesce(round(avg(${reviewsTable.rating})::numeric,1),0)::float`,
      reviewCount: sql<number>`count(distinct ${reviewsTable.id})::int`,
    })
    .from(reviewsTable)
    .where(eq(reviewsTable.businessId, product.businessId));

  res.json({ ...product, isFavorited, avgRating: ratingStats?.avgRating ?? 0, reviewCount: ratingStats?.reviewCount ?? 0 });
});

// POST /products - create (auth required, must own business)
router.post("/products", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const bizId = Number(req.body.businessId);
  if (!bizId) { res.status(400).json({ error: "businessId required" }); return; }

  const [biz] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, bizId));

  if (!biz || biz.ownerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [product] = await db
    .insert(productsTable)
    .values({ ...parsed.data, businessId: bizId })
    .returning();

  res.status(201).json(product);
});

// PUT /products/:id
router.put("/products/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(404).json({ error: "Not found" }); return; }

  const [existing] = await db
    .select({ businessId: productsTable.businessId })
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));

  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const [biz] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, existing.businessId));

  if (!biz || biz.ownerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [updated] = await db
    .update(productsTable)
    .set({ ...req.body, updatedAt: new Date() })
    .where(eq(productsTable.id, params.data.id))
    .returning();

  res.json(updated);
});

// PATCH /products/:id/collection
router.patch("/products/:id/collection", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(404).json({ error: "Not found" }); return; }

  const body = z.object({ collectionId: z.number().int().positive().nullable() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "collectionId must be a positive integer or null" }); return; }

  const [existing] = await db
    .select({ businessId: productsTable.businessId })
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));

  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const [biz] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, existing.businessId));

  if (!biz || biz.ownerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // If assigning a collection, verify it belongs to the same business
  if (body.data.collectionId !== null) {
    const [col] = await db
      .select({ businessId: collectionsTable.businessId })
      .from(collectionsTable)
      .where(eq(collectionsTable.id, body.data.collectionId));
    if (!col || col.businessId !== existing.businessId) {
      res.status(400).json({ error: "Collection not found or belongs to a different business" });
      return;
    }
  }

  const [updated] = await db
    .update(productsTable)
    .set({ collectionId: body.data.collectionId, updatedAt: new Date() })
    .where(eq(productsTable.id, params.data.id))
    .returning();

  res.json(updated);
});

// PATCH /products/:id/stock
router.patch("/products/:id/stock", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(404).json({ error: "Not found" }); return; }

  const parsed = UpdateStockBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "stock must be a non-negative integer or null" }); return; }

  const [existing] = await db
    .select({ businessId: productsTable.businessId })
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));

  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const [biz] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, existing.businessId));

  if (!biz || biz.ownerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [updated] = await db
    .update(productsTable)
    .set({ stock: parsed.data.stock, updatedAt: new Date() })
    .where(eq(productsTable.id, params.data.id))
    .returning();

  res.json(updated);
});

// DELETE /products/:id
router.delete("/products/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(404).json({ error: "Not found" }); return; }

  const [existing] = await db
    .select({ businessId: productsTable.businessId })
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));

  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const [biz] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, existing.businessId));

  if (!biz || biz.ownerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(productsTable).where(eq(productsTable.id, params.data.id));
  res.json({ ok: true });
});

// POST /products/bulk — create up to 50 products at once
router.post("/products/bulk", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const BulkBody = z.object({
    businessId: z.number().int().positive(),
    products: z.array(z.object({
      name: z.string().min(1),
      description: z.string().default(""),
      price: z.string().regex(/^\d+(\.\d{1,2})?$/),
      images: z.array(z.string()).default([]),
      stock: z.number().int().min(0).nullable().optional(),
    })).min(1).max(50),
  });

  const parsed = BulkBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(and(eq(businessesTable.id, parsed.data.businessId), eq(businessesTable.ownerId, req.userId!)));

  if (!business) { res.status(403).json({ error: "Not your business" }); return; }

  const created = await db
    .insert(productsTable)
    .values(
      parsed.data.products.map((p) => ({
        businessId: parsed.data.businessId,
        name: p.name,
        description: p.description,
        price: p.price,
        images: p.images,
        stock: p.stock ?? null,
      }))
    )
    .returning();

  res.status(201).json(created);
});

// POST /products/bulk-discount — apply or clear discount % on selected products
router.post("/products/bulk-discount", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const BulkDiscountBody = z.object({
    businessId: z.number().int().positive(),
    productIds: z.array(z.number().int().positive()).min(1).max(200),
    discountPercent: z.number().min(0).max(90).nullable(),
  });

  const parsed = BulkDiscountBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(and(eq(businessesTable.id, parsed.data.businessId), eq(businessesTable.ownerId, req.userId!)));

  if (!business) { res.status(403).json({ error: "Not your business" }); return; }

  const allProducts = await db
    .select({ id: productsTable.id, price: productsTable.price })
    .from(productsTable)
    .where(eq(productsTable.businessId, parsed.data.businessId));

  const targets = allProducts.filter((p) => parsed.data.productIds.includes(p.id));

  await Promise.all(
    targets.map((p) => {
      const discountPrice =
        parsed.data.discountPercent !== null
          ? (Number(p.price) * (1 - parsed.data.discountPercent / 100)).toFixed(2)
          : null;
      return db
        .update(productsTable)
        .set({ discountPrice, updatedAt: new Date() })
        .where(eq(productsTable.id, p.id));
    })
  );

  res.json({ updated: targets.length });
});

export default router;
