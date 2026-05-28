import { Router, type IRouter } from "express";
import { db, ordersTable, transactionsTable, businessesTable, notificationsTable } from "@workspace/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { createHmac } from "crypto";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

const PAYSTACK_SECRET = process.env["PAYSTACK_SECRET_KEY"] ?? "";
const PAYSTACK_BASE = "https://api.paystack.co";

// ── Paystack Helpers ────────────────────────────────────────────────────────

async function paystackPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { status: boolean; data: T; message: string };
  if (!res.ok || !data.status) throw new Error(data.message ?? "Paystack error");
  return data.data;
}

async function paystackGet<T>(path: string): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  });
  const data = (await res.json()) as { status: boolean; data: T; message: string };
  if (!res.ok || !data.status) throw new Error(data.message ?? "Paystack error");
  return data.data;
}

function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!PAYSTACK_SECRET) return false;
  const hash = createHmac("sha512", PAYSTACK_SECRET).update(body).digest("hex");
  return hash === signature;
}

// ── Schemas ─────────────────────────────────────────────────────────────────

const InitiatePaymentBody = z.object({
  orderId: z.number().int().positive(),
  channel: z.enum(["card", "mobile_money", "bank"]).default("mobile_money"),
  momoPhone: z.string().optional(),
  momoNetwork: z.enum(["MTN", "Vodafone", "AirtelTigo"]).optional(),
});

const VerifyPaymentBody = z.object({
  reference: z.string().min(1),
  orderId: z.number().int().positive(),
});

const RefundBody = z.object({
  orderId: z.number().int().positive(),
  reason: z.string().optional(),
});

const OrderParams = z.object({ orderId: z.coerce.number().int().positive() });

function requireAdmin(req: AuthRequest, res: Parameters<typeof requireAuth>[1], next: Parameters<typeof requireAuth>[2]): void {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

// ── Expose Paystack public key safely ───────────────────────────────────────

router.get("/config/paystack", (_req, res): void => {
  res.json({ publicKey: process.env["PAYSTACK_PUBLIC_KEY"] ?? null });
});

// ── Initialize Paystack Payment (inline popup) ───────────────────────────────
// Creates a pending record + reference. The frontend opens the Paystack popup
// using the PUBLIC KEY. On success the popup callback calls /verify with the ref.

router.post("/payments/paystack/initialize", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = z.object({ orderId: z.number().int().positive() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, parsed.data.orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.userId !== req.userId) { res.status(403).json({ error: "Not your order" }); return; }
  if (order.paymentStatus !== "unpaid") {
    res.status(409).json({ error: "Order already has a payment recorded" });
    return;
  }

  const reference = `NAF-${order.id}-${Date.now()}`;
  const amountPesewas = order.totalPrice; // already in pesewas (Ghana cents)

  await db.insert(transactionsTable).values({
    orderId: order.id,
    userId: req.userId!,
    type: "payment",
    amount: (amountPesewas / 100).toString(),
    currency: "GHS",
    provider: "paystack",
    providerRef: reference,
    channel: "card",
    status: "pending",
    metadata: { orderId: order.id },
  });

  res.json({ reference, amountPesewas, orderId: order.id });
});

// ── Verify Paystack Payment ─────────────────────────────────────────────────

router.post("/payments/paystack/verify", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!PAYSTACK_SECRET) {
    res.status(503).json({ error: "Payment gateway not configured" });
    return;
  }

  const parsed = VerifyPaymentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, parsed.data.orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.userId !== req.userId) { res.status(403).json({ error: "Not your order" }); return; }
  if (order.paymentStatus !== "unpaid") {
    res.status(409).json({ error: "Order payment has already been handled" });
    return;
  }

  try {
    const txData = await paystackGet<{
      status: string;
      reference: string;
      amount: number;
      channel: string;
      gateway_response: string;
    }>(`/transaction/verify/${encodeURIComponent(parsed.data.reference)}`);

    if (txData.status !== "success") {
      res.status(402).json({ error: `Payment not successful: ${txData.gateway_response}` });
      return;
    }

    // Update order to in_escrow
    const [updatedOrder] = await db
      .update(ordersTable)
      .set({ paymentStatus: "in_escrow", paymentReference: parsed.data.reference, updatedAt: new Date() })
      .where(eq(ordersTable.id, parsed.data.orderId))
      .returning();

    // Update transaction to success
    await db
      .update(transactionsTable)
      .set({ status: "success", updatedAt: new Date() })
      .where(and(
        eq(transactionsTable.orderId, order.id),
        eq(transactionsTable.providerRef, parsed.data.reference),
      ));

    // Notify seller
    try {
      const [biz] = await db
        .select({ ownerId: businessesTable.ownerId })
        .from(businessesTable)
        .where(eq(businessesTable.id, order.businessId));
      if (biz?.ownerId) {
        await db.insert(notificationsTable).values({
          userId: biz.ownerId,
          type: "order_update",
          title: `Payment confirmed for Order #${order.id}`,
          body: `GHS ${(order.totalPrice / 100).toFixed(2)} is now held in escrow. Please process the order.`,
          relatedId: order.id,
          isRead: false,
        });
      }
    } catch {}

    res.json({ order: updatedOrder, transaction: txData });
  } catch (err: unknown) {
    res.status(502).json({ error: (err as Error).message ?? "Verification failed" });
  }
});

// ── Paystack Webhook ────────────────────────────────────────────────────────

router.post("/payments/webhook/paystack", async (req, res): Promise<void> => {
  const signature = req.headers["x-paystack-signature"] as string | undefined;
  const rawBody = JSON.stringify(req.body);

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const event = req.body as {
    event: string;
    data: {
      reference: string;
      status: string;
      amount: number;
      metadata?: { orderId?: number };
    };
  };

  if (event.event === "charge.success") {
    const { reference, metadata } = event.data;
    const orderId = metadata?.orderId;
    if (orderId) {
      await db
        .update(ordersTable)
        .set({ paymentStatus: "in_escrow", paymentReference: reference, updatedAt: new Date() })
        .where(and(eq(ordersTable.id, orderId), eq(ordersTable.paymentStatus, "unpaid")));

      await db
        .update(transactionsTable)
        .set({ status: "success", updatedAt: new Date() })
        .where(and(
          eq(transactionsTable.orderId, orderId),
          eq(transactionsTable.providerRef, reference),
        ));
    }
  }

  res.sendStatus(200);
});

// ── User Transaction History ────────────────────────────────────────────────

router.get("/transactions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const txns = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, req.userId!))
    .orderBy(desc(transactionsTable.createdAt));
  res.json(txns);
});

// Admin: all transactions
router.get("/admin/transactions", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const txns = await db
    .select()
    .from(transactionsTable)
    .orderBy(desc(transactionsTable.createdAt))
    .limit(500);
  res.json(txns);
});

// ── Admin: Release Payout ───────────────────────────────────────────────────

router.post("/admin/payouts/:orderId", requireAuth, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const params = OrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid order id" }); return; }

  // Atomic transition: only releases if status is still "in_escrow".
  // Two concurrent calls cannot both succeed.
  const [updated] = await db
    .update(ordersTable)
    .set({ paymentStatus: "released", updatedAt: new Date() })
    .where(and(eq(ordersTable.id, params.data.orderId), eq(ordersTable.paymentStatus, "in_escrow")))
    .returning();

  if (!updated) {
    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.orderId));
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }
    res.status(409).json({ error: `Order is not in escrow (current state: ${existing.paymentStatus})` });
    return;
  }
  const order = updated;

  // Log payout transaction
  await db.insert(transactionsTable).values({
    orderId: order.id,
    userId: req.userId!,
    type: "payout",
    amount: (order.totalPrice / 100).toString(),
    currency: "GHS",
    provider: "system",
    providerRef: `PAYOUT-${order.id}-${Date.now()}`,
    status: "success",
    metadata: { releasedBy: req.userId, reason: "Admin manual release" },
  });

  // Notify seller
  try {
    const [biz] = await db
      .select({ ownerId: businessesTable.ownerId })
      .from(businessesTable)
      .where(eq(businessesTable.id, order.businessId));
    if (biz?.ownerId) {
      await db.insert(notificationsTable).values({
        userId: biz.ownerId,
        type: "order_update",
        title: `Payout released for Order #${order.id}`,
        body: `GHS ${(order.totalPrice / 100).toFixed(2)} has been released from escrow to your account.`,
        relatedId: order.id,
        isRead: false,
      });
    }
  } catch {}

  res.json(updated);
});

// ── Admin: Process Refund ───────────────────────────────────────────────────

router.post("/admin/refunds/:orderId", requireAuth, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const params = OrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid order id" }); return; }

  const parsed = RefundBody.safeParse({ ...req.body, orderId: params.data.orderId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Atomic transition: only refunds if order is currently in_escrow or released.
  // Prevents double-refund under concurrent admin clicks.
  const [updated] = await db
    .update(ordersTable)
    .set({ paymentStatus: "refunded", status: "cancelled", updatedAt: new Date() })
    .where(and(
      eq(ordersTable.id, params.data.orderId),
      inArray(ordersTable.paymentStatus, ["in_escrow", "released"]),
    ))
    .returning();

  if (!updated) {
    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.orderId));
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }
    res.status(409).json({ error: `Order cannot be refunded (current state: ${existing.paymentStatus})` });
    return;
  }
  const order = updated;

  // Best-effort Paystack refund call. DB is already in "refunded" state so admin
  // can handle Paystack failures manually if it returns an error.
  if (PAYSTACK_SECRET && order.paymentReference) {
    try {
      await paystackPost("/refund", {
        transaction: order.paymentReference,
        amount: order.totalPrice,
        currency: "GHS",
        merchant_note: parsed.data.reason ?? "Buyer refund via Nafex Hub admin",
      });
    } catch (err) {
      req.log?.warn({ err, orderId: order.id, ref: order.paymentReference }, "Paystack refund call failed; DB marked refunded for manual handling");
    }
  }

  await db.insert(transactionsTable).values({
    orderId: order.id,
    userId: order.userId,
    type: "refund",
    amount: (order.totalPrice / 100).toString(),
    currency: "GHS",
    provider: PAYSTACK_SECRET ? "paystack" : "manual",
    providerRef: `REFUND-${order.id}-${Date.now()}`,
    status: "success",
    metadata: { reason: parsed.data.reason, refundedBy: req.userId },
  });

  // Notify buyer
  try {
    await db.insert(notificationsTable).values({
      userId: order.userId,
      type: "order_update",
      title: `Refund processed for Order #${order.id}`,
      body: `Your refund of GHS ${(order.totalPrice / 100).toFixed(2)} has been processed. It may take 1-5 business days to reflect.`,
      relatedId: order.id,
      isRead: false,
    });
  } catch {}

  res.json(updated);
});

export default router;
