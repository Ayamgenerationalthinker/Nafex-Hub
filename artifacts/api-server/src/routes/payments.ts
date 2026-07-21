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

export async function paystackPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
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

function verifyWebhookSignature(body: string | Buffer, signature: string): boolean {
  if (!PAYSTACK_SECRET) return false;
  const hash = createHmac("sha512", PAYSTACK_SECRET).update(body).digest("hex");
  return hash === signature;
}

export async function payoutToSeller(businessId: number, amountPesewas: number, orderId: number): Promise<boolean> {
  const [biz] = await db
    .select({ paystackRecipientCode: businessesTable.paystackRecipientCode, name: businessesTable.name })
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId));

  if (!biz || !biz.paystackRecipientCode) {
    console.error(`Cannot payout to business ${businessId}: No Paystack recipient code found.`);
    return false;
  }

  try {
    await paystackPost("/transfer", {
      source: "balance",
      amount: amountPesewas,
      recipient: biz.paystackRecipientCode,
      reason: `Escrow release for Order #${orderId} from Nafex Hub`,
    });
    return true;
  } catch (error) {
    console.error(`Failed to transfer to business ${businessId}:`, error);
    return false;
  }
}

export async function payoutToTradeSupplier(supplierId: number, amountPesewas: number, orderId: number): Promise<boolean> {
  const [biz] = await db
    .select({ paystackRecipientCode: businessesTable.paystackRecipientCode, name: businessesTable.name })
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, supplierId));

  if (!biz || !biz.paystackRecipientCode) {
    console.error(`Cannot payout to supplier ${supplierId}: No Paystack recipient code found for their business.`);
    return false;
  }

  try {
    await paystackPost("/transfer", {
      source: "balance",
      amount: amountPesewas,
      recipient: biz.paystackRecipientCode,
      reason: `Escrow release for Trade Order #${orderId} from Nafex Hub`,
    });
    return true;
  } catch (error) {
    console.error(`Failed to transfer to supplier ${supplierId}:`, error);
    return false;
  }
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
  const parsed = z.object({ 
    orderId: z.number().int().positive(),
    milestoneId: z.number().int().positive().optional()
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, parsed.data.orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.userId !== req.userId) { res.status(403).json({ error: "Not your order" }); return; }
  if (order.paymentStatus !== "unpaid" && order.paymentStatus !== "partial") {
    res.status(409).json({ error: "Order already fully paid or settled" });
    return;
  }

  const reference = `NAF-${order.id}-${Date.now()}`;
  
  let amountPesewas = order.totalPrice; // already in pesewas (Ghana cents)
  
  if (parsed.data.milestoneId && order.isB2b) {
    const milestones = (order.milestones as any[]) || [];
    const milestone = milestones.find((m) => m.id === parsed.data.milestoneId);
    if (!milestone) { res.status(404).json({ error: "Milestone not found" }); return; }
    if (milestone.status !== "pending") { res.status(409).json({ error: "Milestone already funded" }); return; }
    amountPesewas = milestone.amount;
  }

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
    metadata: { orderId: order.id, milestoneId: parsed.data.milestoneId },
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

    // Find the pending transaction to check if it was for a milestone
    const [pendingTx] = await db
      .select({ metadata: transactionsTable.metadata })
      .from(transactionsTable)
      .where(and(eq(transactionsTable.orderId, parsed.data.orderId), eq(transactionsTable.providerRef, parsed.data.reference)));

    const milestoneId = (pendingTx?.metadata as any)?.milestoneId;
    
    let newPaymentStatus = "in_escrow";
    let newMilestones = order.milestones as any[];

    if (order.isB2b && milestoneId) {
      newMilestones = (order.milestones as any[]).map(m => 
        m.id === milestoneId ? { ...m, status: "in_escrow" } : m
      );
      const allFunded = newMilestones.every(m => m.status !== "pending");
      newPaymentStatus = allFunded ? "in_escrow" : "partial";
    }

    // Update order
    const [updatedOrder] = await db
      .update(ordersTable)
      .set({ 
        paymentStatus: newPaymentStatus as any, 
        paymentReference: parsed.data.reference, 
        milestones: newMilestones,
        updatedAt: new Date() 
      })
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
  const rawBody = (req as any).rawBody as Buffer | undefined;
  const bodyToVerify = rawBody ?? JSON.stringify(req.body);

  if (!signature || !verifyWebhookSignature(bodyToVerify, signature)) {
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

  // Calculate Tiered Commission
  const totalPriceGhs = order.totalPrice / 100;
  let commissionRate = 0.05; // 5% default for 501+
  if (totalPriceGhs <= 100) {
    commissionRate = 0.015; // 1.5% for 1 - 100 GHS
  } else if (totalPriceGhs <= 500) {
    commissionRate = 0.03;  // 3% for 101 - 500 GHS
  }

  const commissionPesewas = Math.floor(order.totalPrice * commissionRate);
  const payoutAmount = order.totalPrice - commissionPesewas;

  // Execute actual Paystack transfer
  await payoutToSeller(order.businessId, payoutAmount, order.id);

  // Log payout transaction
  await db.insert(transactionsTable).values({
    orderId: order.id,
    userId: req.userId!,
    type: "payout",
    amount: (payoutAmount / 100).toString(),
    currency: "GHS",
    provider: "paystack",
    providerRef: `PAYOUT-${order.id}-${Date.now()}`,
    status: "success",
    metadata: { releasedBy: req.userId, reason: "Admin manual release", commissionPesewas },
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
        body: `GHS ${(payoutAmount / 100).toFixed(2)} has been released from escrow to your account (minus GHS ${(commissionPesewas / 100).toFixed(2)} platform commission).`,
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
