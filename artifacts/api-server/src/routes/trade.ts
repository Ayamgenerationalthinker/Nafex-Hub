import { Router, type IRouter } from "express";
import { db, tradeRequestsTable, tradeQuotesTable, usersTable, businessesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

const CreateRequestBody = z.object({
  productName: z.string().min(2).max(200),
  quantity: z.number().int().positive(),
  budget: z.number().positive(),
  description: z.string().min(10).max(2000),
});

const CreateQuoteBody = z.object({
  requestId: z.number().int().positive(),
  unitPrice: z.number().positive(),
  moq: z.number().int().positive(),
  shippingCost: z.number().nonnegative().default(0),
  productionTime: z.string().min(1).max(100),
  notes: z.string().max(1000).optional(),
});

const UpdateStatusBody = z.object({
  status: z.enum(["pending", "fulfilled", "cancelled"]),
});

const IdParams = z.object({ id: z.coerce.number().int().positive() });

// ── Create import request ────────────────────────────────────────────────────
router.post("/trade/request", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [request] = await db
    .insert(tradeRequestsTable)
    .values({
      userId: req.userId!,
      productName: parsed.data.productName,
      quantity: parsed.data.quantity,
      budget: parsed.data.budget.toString(),
      description: parsed.data.description,
    })
    .returning();

  res.status(201).json(request);
});

// ── List all open requests (marketplace board) ───────────────────────────────
router.get("/trade/requests", requireAuth, async (_req, res): Promise<void> => {
  const requests = await db
    .select({
      id: tradeRequestsTable.id,
      userId: tradeRequestsTable.userId,
      productName: tradeRequestsTable.productName,
      quantity: tradeRequestsTable.quantity,
      budget: tradeRequestsTable.budget,
      description: tradeRequestsTable.description,
      status: tradeRequestsTable.status,
      createdAt: tradeRequestsTable.createdAt,
      userName: usersTable.name,
    })
    .from(tradeRequestsTable)
    .leftJoin(usersTable, eq(tradeRequestsTable.userId, usersTable.id))
    .orderBy(desc(tradeRequestsTable.createdAt));

  res.json(requests);
});

// ── Current user's own requests ──────────────────────────────────────────────
router.get("/trade/my-requests", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const requests = await db
    .select()
    .from(tradeRequestsTable)
    .where(eq(tradeRequestsTable.userId, req.userId!))
    .orderBy(desc(tradeRequestsTable.createdAt));

  // Attach quote count to each request
  const withCounts = await Promise.all(
    requests.map(async (r) => {
      const quotes = await db
        .select()
        .from(tradeQuotesTable)
        .where(eq(tradeQuotesTable.requestId, r.id));
      return { ...r, quoteCount: quotes.length };
    })
  );

  res.json(withCounts);
});

// ── Single request + its quotes ──────────────────────────────────────────────
router.get("/trade/request/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [request] = await db
    .select({
      id: tradeRequestsTable.id,
      userId: tradeRequestsTable.userId,
      productName: tradeRequestsTable.productName,
      quantity: tradeRequestsTable.quantity,
      budget: tradeRequestsTable.budget,
      description: tradeRequestsTable.description,
      status: tradeRequestsTable.status,
      createdAt: tradeRequestsTable.createdAt,
      userName: usersTable.name,
    })
    .from(tradeRequestsTable)
    .leftJoin(usersTable, eq(tradeRequestsTable.userId, usersTable.id))
    .where(eq(tradeRequestsTable.id, params.data.id));

  if (!request) { res.status(404).json({ error: "Request not found" }); return; }

  const quotes = await db
    .select()
    .from(tradeQuotesTable)
    .where(eq(tradeQuotesTable.requestId, params.data.id))
    .orderBy(tradeQuotesTable.createdAt);

  res.json({ ...request, quotes });
});

// ── Submit a quote (sellers only) ────────────────────────────────────────────
router.post("/trade/quote", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateQuoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Verify the request exists and is still open
  const [request] = await db
    .select()
    .from(tradeRequestsTable)
    .where(eq(tradeRequestsTable.id, parsed.data.requestId));

  if (!request) { res.status(404).json({ error: "Trade request not found" }); return; }
  if (request.status !== "pending") {
    res.status(409).json({ error: "This request is no longer accepting quotes" });
    return;
  }
  if (request.userId === req.userId) {
    res.status(400).json({ error: "You cannot quote your own request" });
    return;
  }

  // Use business name if seller has one, else user name
  const [biz] = await db
    .select({ name: businessesTable.name })
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, req.userId!));

  const [user] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  const supplierName = biz?.name ?? user?.name ?? "Anonymous";

  const [quote] = await db
    .insert(tradeQuotesTable)
    .values({
      requestId: parsed.data.requestId,
      supplierId: req.userId!,
      supplierName,
      unitPrice: parsed.data.unitPrice.toString(),
      moq: parsed.data.moq,
      shippingCost: parsed.data.shippingCost.toString(),
      productionTime: parsed.data.productionTime,
      notes: parsed.data.notes,
    })
    .returning();

  res.status(201).json(quote);
});

// ── Get quotes for a request ─────────────────────────────────────────────────
router.get("/trade/quotes/:requestId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = z.object({ requestId: z.coerce.number().int().positive() }).safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid requestId" }); return; }

  const quotes = await db
    .select()
    .from(tradeQuotesTable)
    .where(eq(tradeQuotesTable.requestId, params.data.requestId))
    .orderBy(tradeQuotesTable.createdAt);

  res.json(quotes);
});

// ── Update request status ────────────────────────────────────────────────────
router.patch("/trade/request/:id/status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [request] = await db
    .select()
    .from(tradeRequestsTable)
    .where(eq(tradeRequestsTable.id, params.data.id));

  if (!request) { res.status(404).json({ error: "Not found" }); return; }

  const isOwner = request.userId === req.userId;
  const isAdmin = req.userRole === "admin";
  if (!isOwner && !isAdmin) { res.status(403).json({ error: "Not authorized" }); return; }

  const [updated] = await db
    .update(tradeRequestsTable)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(tradeRequestsTable.id, params.data.id))
    .returning();

  res.json(updated);
});

export default router;
