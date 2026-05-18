import { Router, type IRouter } from "express";
import {
  db,
  tradeRequestsTable,
  tradeQuotesTable,
  tradeOrdersTable,
  tradeEscrowTable,
  tradeTrackingEventsTable,
  usersTable,
  TRADE_ORDER_STATUSES,
} from "@workspace/db";
import { eq, desc, and, or } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { getIO } from "../lib/socket";

const router: IRouter = Router();

const PAYSTACK_SECRET = process.env["PAYSTACK_SECRET_KEY"];

const IdParams = z.object({ id: z.coerce.number().int().positive() });

// ── Helper: emit trade status update via Socket.IO ───────────────────────────
function emitTradeUpdate(orderId: number, event: string, data: unknown) {
  const io = getIO();
  if (io) io.to(`trade_${orderId}`).emit(event, data);
}

// ── Accept a quote → create trade order + escrow record ──────────────────────
router.post("/trade/quotes/:id/accept", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid quote id" }); return; }

  const [quote] = await db.select().from(tradeQuotesTable).where(eq(tradeQuotesTable.id, params.data.id));
  if (!quote) { res.status(404).json({ error: "Quote not found" }); return; }
  if (quote.status !== "pending") { res.status(409).json({ error: "Quote already accepted or rejected" }); return; }

  const [request] = await db.select().from(tradeRequestsTable).where(eq(tradeRequestsTable.id, quote.requestId));
  if (!request) { res.status(404).json({ error: "Trade request not found" }); return; }
  if (request.userId !== req.userId) { res.status(403).json({ error: "Only the request owner can accept quotes" }); return; }

  const totalAmount = (parseFloat(quote.unitPrice) * request.quantity + parseFloat(quote.shippingCost)).toString();

  // Create order
  const [order] = await db.insert(tradeOrdersTable).values({
    requestId: request.id,
    quoteId: quote.id,
    buyerId: request.userId,
    supplierId: quote.supplierId,
    totalAmount,
    quantity: request.quantity,
    productName: request.productName,
    supplierName: quote.supplierName,
  }).returning();

  // Mark quote accepted, others rejected
  await db.update(tradeQuotesTable)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(eq(tradeQuotesTable.id, quote.id));

  // Mark request as sourcing
  await db.update(tradeRequestsTable)
    .set({ status: "sourcing" })
    .where(eq(tradeRequestsTable.id, request.id));

  // Create escrow record (unfunded)
  const [escrow] = await db.insert(tradeEscrowTable).values({
    orderId: order.id,
    buyerId: request.userId,
    supplierId: quote.supplierId,
    amount: totalAmount,
  }).returning();

  // Initial tracking event
  await db.insert(tradeTrackingEventsTable).values({
    orderId: order.id,
    status: "pending",
    description: "Trade order created. Awaiting escrow payment from buyer.",
    createdBy: req.userId!,
  });

  res.status(201).json({ order, escrow });
});

// ── Buyer: initialize escrow payment (Paystack inline popup) ─────────────────
// Creates a reference, saves it to escrow record. Frontend opens popup with
// PUBLIC KEY; on success the popup callback calls /trade/escrow/:id/verify.
router.post("/trade/escrow/:orderId/initialize", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = z.object({ orderId: z.coerce.number().int().positive() }).safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid orderId" }); return; }

  const [escrow] = await db.select().from(tradeEscrowTable).where(eq(tradeEscrowTable.orderId, params.data.orderId));
  if (!escrow) { res.status(404).json({ error: "Escrow record not found" }); return; }
  if (escrow.buyerId !== req.userId) { res.status(403).json({ error: "Only the buyer can fund escrow" }); return; }
  if (escrow.paystackStatus === "success") { res.status(409).json({ error: "Escrow already funded" }); return; }

  const [user] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const reference = `trade_escrow_${escrow.orderId}_${Date.now()}`;
  const amountPesewas = Math.round(parseFloat(escrow.amount) * 100);

  await db.update(tradeEscrowTable)
    .set({ paystackRef: reference })
    .where(eq(tradeEscrowTable.id, escrow.id));

  res.json({ reference, amountPesewas, escrowId: escrow.id, email: user.email });
});

// ── Verify escrow payment ─────────────────────────────────────────────────────
router.post("/trade/escrow/:orderId/verify", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = z.object({ orderId: z.coerce.number().int().positive() }).safeParse(req.params);
  const body = z.object({ reference: z.string().min(1) }).safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid params" }); return; }

  const [escrow] = await db.select().from(tradeEscrowTable).where(eq(tradeEscrowTable.orderId, params.data.orderId));
  if (!escrow) { res.status(404).json({ error: "Escrow not found" }); return; }
  if (escrow.buyerId !== req.userId) { res.status(403).json({ error: "Not authorized" }); return; }
  if (escrow.paystackStatus === "success") { res.json({ message: "Already funded" }); return; }

  if (PAYSTACK_SECRET) {
    const psRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(body.data.reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    const psData = (await psRes.json()) as { data?: { status: string; amount: number } };
    if (psData.data?.status !== "success") {
      res.status(402).json({ error: "Payment not yet confirmed by Paystack" });
      return;
    }
  }

  await db.update(tradeEscrowTable)
    .set({ paystackStatus: "success", paystackRef: body.data.reference, fundedAt: new Date() })
    .where(eq(tradeEscrowTable.id, escrow.id));

  const [updatedOrder] = await db.update(tradeOrdersTable)
    .set({ escrowStatus: "funded", status: "sourcing", updatedAt: new Date() })
    .where(eq(tradeOrdersTable.id, escrow.orderId))
    .returning();

  await db.insert(tradeTrackingEventsTable).values({
    orderId: escrow.orderId,
    status: "sourcing",
    description: `Escrow funded: GHS ${escrow.amount}. Supplier is now sourcing/confirming the order.`,
    createdBy: req.userId!,
  });

  emitTradeUpdate(escrow.orderId, "trade:escrow_funded", { orderId: escrow.orderId, amount: escrow.amount });
  emitTradeUpdate(escrow.orderId, "trade:status_updated", { orderId: escrow.orderId, status: "sourcing" });

  res.json({ escrow: { ...escrow, paystackStatus: "success" }, order: updatedOrder });
});

// ── Buyer confirms delivery → trigger escrow release ─────────────────────────
router.post("/trade/orders/:id/confirm-delivery", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [order] = await db.select().from(tradeOrdersTable).where(eq(tradeOrdersTable.id, params.data.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.buyerId !== req.userId) { res.status(403).json({ error: "Only the buyer can confirm delivery" }); return; }
  if (order.escrowStatus !== "funded") { res.status(409).json({ error: "Escrow is not in funded state" }); return; }
  if (order.buyerConfirmedDelivery) { res.status(409).json({ error: "Delivery already confirmed" }); return; }

  const [updatedOrder] = await db.update(tradeOrdersTable)
    .set({ buyerConfirmedDelivery: true, status: "delivered", escrowStatus: "released", updatedAt: new Date() })
    .where(eq(tradeOrdersTable.id, order.id))
    .returning();

  await db.update(tradeEscrowTable)
    .set({ releasedAt: new Date() })
    .where(eq(tradeEscrowTable.orderId, order.id));

  await db.insert(tradeTrackingEventsTable).values({
    orderId: order.id,
    status: "delivered",
    description: "Buyer confirmed delivery. Escrow funds released to supplier.",
    createdBy: req.userId!,
  });

  emitTradeUpdate(order.id, "trade:status_updated", { orderId: order.id, status: "delivered", escrowStatus: "released" });

  res.json(updatedOrder);
});

// ── Update order status (supplier or admin) ───────────────────────────────────
router.patch("/trade/orders/:id/status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParams.safeParse(req.params);
  const body = z.object({
    status: z.enum(TRADE_ORDER_STATUSES),
    note: z.string().max(500).optional(),
    location: z.string().max(200).optional(),
  }).safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid data" }); return; }

  const [order] = await db.select().from(tradeOrdersTable).where(eq(tradeOrdersTable.id, params.data.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const isSupplier = order.supplierId === req.userId;
  const isAdmin    = req.userRole === "admin";
  if (!isSupplier && !isAdmin) { res.status(403).json({ error: "Not authorized" }); return; }

  const [updatedOrder] = await db.update(tradeOrdersTable)
    .set({ status: body.data.status, updatedAt: new Date() })
    .where(eq(tradeOrdersTable.id, order.id))
    .returning();

  const statusLabels: Record<string, string> = {
    sourcing: "Supplier is sourcing the goods.",
    quoted:   "Supplier has confirmed/re-quoted the order.",
    production: "Goods are in production.",
    shipped:  "Goods have been shipped.",
    customs:  "Shipment is in customs clearance.",
    delivered: "Goods delivered.",
  };

  await db.insert(tradeTrackingEventsTable).values({
    orderId: order.id,
    status: body.data.status,
    description: body.data.note ?? statusLabels[body.data.status] ?? `Status updated to ${body.data.status}`,
    location: body.data.location ?? null,
    createdBy: req.userId!,
  });

  emitTradeUpdate(order.id, "trade:status_updated", { orderId: order.id, status: body.data.status });

  res.json(updatedOrder);
});

// ── Add manual tracking event ─────────────────────────────────────────────────
router.post("/trade/orders/:id/tracking", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParams.safeParse(req.params);
  const body = z.object({
    status: z.string().min(1),
    description: z.string().min(1).max(500),
    location: z.string().max(200).optional(),
  }).safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid data" }); return; }

  const [order] = await db.select().from(tradeOrdersTable).where(eq(tradeOrdersTable.id, params.data.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const canUpdate = order.supplierId === req.userId || order.buyerId === req.userId || req.userRole === "admin";
  if (!canUpdate) { res.status(403).json({ error: "Not authorized" }); return; }

  const [event] = await db.insert(tradeTrackingEventsTable).values({
    orderId: order.id,
    status: body.data.status,
    description: body.data.description,
    location: body.data.location ?? null,
    createdBy: req.userId!,
  }).returning();

  emitTradeUpdate(order.id, "trade:tracking_event", event);

  res.status(201).json(event);
});

// ── Get tracking events for an order ─────────────────────────────────────────
router.get("/trade/orders/:id/tracking", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [order] = await db.select().from(tradeOrdersTable).where(eq(tradeOrdersTable.id, params.data.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const canView = order.supplierId === req.userId || order.buyerId === req.userId || req.userRole === "admin";
  if (!canView) { res.status(403).json({ error: "Not authorized" }); return; }

  const events = await db.select()
    .from(tradeTrackingEventsTable)
    .where(eq(tradeTrackingEventsTable.orderId, params.data.id))
    .orderBy(desc(tradeTrackingEventsTable.createdAt));

  res.json(events);
});

// ── Get single order (buyer or supplier) ──────────────────────────────────────
router.get("/trade/orders/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [order] = await db.select().from(tradeOrdersTable).where(eq(tradeOrdersTable.id, params.data.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const canView = order.supplierId === req.userId || order.buyerId === req.userId || req.userRole === "admin";
  if (!canView) { res.status(403).json({ error: "Not authorized" }); return; }

  const [escrow] = await db.select().from(tradeEscrowTable).where(eq(tradeEscrowTable.orderId, order.id));
  const tracking = await db.select().from(tradeTrackingEventsTable)
    .where(eq(tradeTrackingEventsTable.orderId, order.id))
    .orderBy(desc(tradeTrackingEventsTable.createdAt));

  res.json({ ...order, escrow: escrow ?? null, tracking });
});

// ── Buyer's trade orders ──────────────────────────────────────────────────────
router.get("/trade/orders/my", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const orders = await db.select().from(tradeOrdersTable)
    .where(eq(tradeOrdersTable.buyerId, req.userId!))
    .orderBy(desc(tradeOrdersTable.createdAt));

  res.json(orders);
});

// ── Supplier's trade orders ───────────────────────────────────────────────────
router.get("/trade/orders/supplier", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const orders = await db.select().from(tradeOrdersTable)
    .where(eq(tradeOrdersTable.supplierId, req.userId!))
    .orderBy(desc(tradeOrdersTable.createdAt));

  res.json(orders);
});

// ── Admin: all trade orders ───────────────────────────────────────────────────
router.get("/admin/trade-orders", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const orders = await db.select({
    id: tradeOrdersTable.id,
    productName: tradeOrdersTable.productName,
    buyerId: tradeOrdersTable.buyerId,
    supplierId: tradeOrdersTable.supplierId,
    supplierName: tradeOrdersTable.supplierName,
    quantity: tradeOrdersTable.quantity,
    totalAmount: tradeOrdersTable.totalAmount,
    status: tradeOrdersTable.status,
    escrowStatus: tradeOrdersTable.escrowStatus,
    buyerConfirmedDelivery: tradeOrdersTable.buyerConfirmedDelivery,
    createdAt: tradeOrdersTable.createdAt,
    updatedAt: tradeOrdersTable.updatedAt,
    buyerName: usersTable.name,
  })
    .from(tradeOrdersTable)
    .leftJoin(usersTable, eq(tradeOrdersTable.buyerId, usersTable.id))
    .orderBy(desc(tradeOrdersTable.createdAt));

  res.json(orders);
});

// ── Admin: update order status + refund escrow ────────────────────────────────
router.patch("/admin/trade-orders/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const params = IdParams.safeParse(req.params);
  const body = z.object({
    status: z.enum(TRADE_ORDER_STATUSES).optional(),
    escrowAction: z.enum(["release", "refund"]).optional(),
    note: z.string().max(500).optional(),
  }).safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid data" }); return; }

  const [order] = await db.select().from(tradeOrdersTable).where(eq(tradeOrdersTable.id, params.data.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const updates: Partial<typeof tradeOrdersTable.$inferInsert> & { updatedAt?: Date } = { updatedAt: new Date() };

  if (body.data.status) updates.status = body.data.status;

  if (body.data.escrowAction === "release") {
    updates.escrowStatus = "released";
    await db.update(tradeEscrowTable).set({ releasedAt: new Date() }).where(eq(tradeEscrowTable.orderId, order.id));
  } else if (body.data.escrowAction === "refund") {
    updates.escrowStatus = "refunded";
    await db.update(tradeEscrowTable).set({ refundedAt: new Date() }).where(eq(tradeEscrowTable.orderId, order.id));
  }

  const [updatedOrder] = await db.update(tradeOrdersTable)
    .set(updates)
    .where(eq(tradeOrdersTable.id, order.id))
    .returning();

  if (body.data.status || body.data.note) {
    await db.insert(tradeTrackingEventsTable).values({
      orderId: order.id,
      status: body.data.status ?? order.status,
      description: body.data.note ?? `Admin updated status to ${body.data.status ?? order.status}`,
      createdBy: req.userId!,
    });
  }

  emitTradeUpdate(order.id, "trade:status_updated", { orderId: order.id, status: updatedOrder.status, escrowStatus: updatedOrder.escrowStatus });

  res.json(updatedOrder);
});

export default router;
