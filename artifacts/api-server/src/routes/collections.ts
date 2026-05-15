import { Router, type IRouter } from "express";
import { db, collectionsTable, businessesTable, productsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

const IdParam = z.object({ id: z.coerce.number().int().positive() });

const CreateBody = z.object({
  businessId: z.coerce.number().int().positive(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  coverImage: z.string().url().optional().or(z.literal("")),
});

const UpdateBody = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  coverImage: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
});

async function ownsCollection(userId: number, collectionId: number) {
  const [col] = await db
    .select({ businessId: collectionsTable.businessId })
    .from(collectionsTable)
    .where(eq(collectionsTable.id, collectionId));
  if (!col) return null;

  const [biz] = await db
    .select({ ownerId: businessesTable.ownerId })
    .from(businessesTable)
    .where(eq(businessesTable.id, col.businessId));

  if (!biz || biz.ownerId !== userId) return null;
  return col;
}

// GET /collections?businessId=
router.get("/collections", async (req, res): Promise<void> => {
  const parsed = z.coerce.number().int().positive().safeParse(req.query.businessId);
  if (!parsed.success) {
    res.status(400).json({ error: "businessId query param required" });
    return;
  }

  const collections = await db
    .select()
    .from(collectionsTable)
    .where(eq(collectionsTable.businessId, parsed.data))
    .orderBy(asc(collectionsTable.createdAt));

  const allProducts = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.businessId, parsed.data))
    .orderBy(asc(productsTable.createdAt));

  const result = collections.map((col) => ({
    ...col,
    products: allProducts.filter((p) => p.collectionId === col.id),
  }));

  res.json(result);
});

// POST /collections
router.post("/collections", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [biz] = await db
    .select({ ownerId: businessesTable.ownerId })
    .from(businessesTable)
    .where(eq(businessesTable.id, parsed.data.businessId));

  if (!biz || biz.ownerId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [col] = await db
    .insert(collectionsTable)
    .values({
      businessId: parsed.data.businessId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      coverImage: parsed.data.coverImage || null,
    })
    .returning();

  res.status(201).json(col);
});

// PUT /collections/:id
router.put("/collections/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const col = await ownsCollection(req.userId!, params.data.id);
  if (!col) {
    res.status(404).json({ error: "Not found or forbidden" });
    return;
  }

  const parsed = UpdateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(collectionsTable)
    .set({
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(parsed.data.coverImage !== undefined && { coverImage: parsed.data.coverImage }),
    })
    .where(eq(collectionsTable.id, params.data.id))
    .returning();

  res.json(updated);
});

// DELETE /collections/:id
router.delete("/collections/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const col = await ownsCollection(req.userId!, params.data.id);
  if (!col) {
    res.status(404).json({ error: "Not found or forbidden" });
    return;
  }

  await db
    .update(productsTable)
    .set({ collectionId: null })
    .where(eq(productsTable.collectionId, params.data.id));

  await db.delete(collectionsTable).where(eq(collectionsTable.id, params.data.id));
  res.json({ ok: true });
});

export default router;
