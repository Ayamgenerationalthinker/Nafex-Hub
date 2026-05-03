import { Router, type IRouter } from "express";
import { db, productsTable, businessesTable, favoritesTable } from "@workspace/db";
import { desc, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, optionalAuth, type AuthRequest } from "../lib/auth-middleware";
import { logAdminAction } from "../lib/log-admin-action";

const router: IRouter = Router();

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const BusinessIdParam = z.object({ businessId: z.coerce.number().int().positive() });

const CreateBody = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  images: z.array(z.string()).default([]),
  stock: z.number().int().min(0).nullable().optional(),
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
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
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
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      images: productsTable.images,
      stock: productsTable.stock,
      createdAt: productsTable.createdAt,
      updatedAt: productsTable.updatedAt,
      businessName: businessesTable.name,
      businessLogo: businessesTable.logo,
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

  res.json({ ...product, isFavorited });
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

export default router;
