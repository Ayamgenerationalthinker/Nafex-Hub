import { Router, type IRouter } from "express";
import { db, flashSalesTable, productsTable, businessesTable } from "@workspace/db";
import { eq, and, gt, lt, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { validateBody, validateQuery } from "../lib/validation";

const router: IRouter = Router();

function requireAdmin(req: AuthRequest, res: any, next: any) {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
  next();
}

const FlashSaleBody = z.object({
  productId: z.number().int().positive(),
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional().default(""),
  discountPercent: z.number().int().min(1).max(95),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

// ── Public: list currently-active flash sales ────────────────────────────────
router.get("/flash-sales/active", async (_req, res): Promise<void> => {
  const now = new Date();
  const rows = await db
    .select({
      id: flashSalesTable.id,
      productId: flashSalesTable.productId,
      title: flashSalesTable.title,
      description: flashSalesTable.description,
      discountPercent: flashSalesTable.discountPercent,
      startsAt: flashSalesTable.startsAt,
      endsAt: flashSalesTable.endsAt,
      productName: productsTable.name,
      productPrice: productsTable.price,
      productImages: productsTable.images,
      businessId: businessesTable.id,
      businessName: businessesTable.name,
      businessLogo: businessesTable.logo,
    })
    .from(flashSalesTable)
    .innerJoin(productsTable, eq(productsTable.id, flashSalesTable.productId))
    .innerJoin(businessesTable, eq(businessesTable.id, productsTable.businessId))
    .where(and(
      eq(flashSalesTable.isActive, true),
      lt(flashSalesTable.startsAt, now),
      gt(flashSalesTable.endsAt, now),
    ))
    .orderBy(desc(flashSalesTable.discountPercent))
    .limit(20);
  res.json(rows);
});

// ── Admin: list all flash sales ──────────────────────────────────────────────
router.get("/admin/flash-sales", requireAuth, requireAdmin, async (_req: AuthRequest, res): Promise<void> => {
  const rows = await db
    .select({
      id: flashSalesTable.id,
      productId: flashSalesTable.productId,
      title: flashSalesTable.title,
      description: flashSalesTable.description,
      discountPercent: flashSalesTable.discountPercent,
      startsAt: flashSalesTable.startsAt,
      endsAt: flashSalesTable.endsAt,
      isActive: flashSalesTable.isActive,
      createdAt: flashSalesTable.createdAt,
      productName: productsTable.name,
      businessName: businessesTable.name,
    })
    .from(flashSalesTable)
    .leftJoin(productsTable, eq(productsTable.id, flashSalesTable.productId))
    .leftJoin(businessesTable, eq(businessesTable.id, productsTable.businessId))
    .orderBy(desc(flashSalesTable.createdAt));
  res.json(rows);
});

// ── Admin: create ────────────────────────────────────────────────────────────
router.post("/admin/flash-sales", requireAuth, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  // Validation middleware injected elsewhere for FlashSaleBody); return; }
  if (new Date(parsed.data.endsAt) <= new Date(parsed.data.startsAt)) {
    res.status(400).json({ error: "endsAt must be after startsAt" });
    return;
  }
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, parsed.data.productId));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  const [created] = await db.insert(flashSalesTable).values({
    productId: parsed.data.productId,
    title: parsed.data.title,
    description: parsed.data.description ?? "",
    discountPercent: parsed.data.discountPercent,
    startsAt: new Date(parsed.data.startsAt),
    endsAt: new Date(parsed.data.endsAt),
    createdBy: req.userId!,
  }).returning();
  res.status(201).json(created);
});

// ── Admin: toggle active ─────────────────────────────────────────────────────
router.patch("/admin/flash-sales/:id", requireAuth, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = z.object({ isActive: z.boolean() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.message }); return; }
  const [updated] = await db.update(flashSalesTable).set({ isActive: body.data.isActive }).where(eq(flashSalesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// ── Admin: delete ────────────────────────────────────────────────────────────
router.delete("/admin/flash-sales/:id", requireAuth, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const result = await db.delete(flashSalesTable).where(eq(flashSalesTable.id, id)).returning();
  if (result.length === 0) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ok: true });
});

export default router;
// silence unused import
void sql;
