import { Router, type IRouter } from "express";
import { db, disputesTable, ordersTable, transactionsTable, businessesTable, notificationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { validateBody, validateQuery } from "../lib/validation";

const router: IRouter = Router();

const CreateDisputeBody = z.object({
  orderId: z.number().int().positive(),
  reason: z.enum([
    "item_not_received",
    "item_not_as_described",
    "damaged_item",
    "wrong_item",
    "seller_unresponsive",
    "other",
  ]),
  description: z.string().min(10, "Please describe the issue in at least 10 characters"),
  evidenceUrls: z.array(z.string().url()).default([]),
});

const ResolveDisputeBody = z.object({
  status: z.enum(["resolved_buyer", "resolved_seller", "dismissed"]),
  resolution: z.string().min(1, "Resolution note is required"),
  adminNote: z.string().optional(),
  processRefund: z.boolean().default(false),
  releasePayout: z.boolean().default(false),
});

const DisputeParams = z.object({ id: z.coerce.number().int().positive() });

function requireAdmin(req: AuthRequest, res: Parameters<typeof requireAuth>[1], next: Parameters<typeof requireAuth>[2]): void {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

// Buyer: raise dispute
router.post("/disputes", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  // Validation middleware injected elsewhere for CreateDisputeBody); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, parsed.data.orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.userId !== req.userId) { res.status(403).json({ error: "Not your order" }); return; }

  // Can only dispute orders that have been paid
  if (order.paymentStatus === "unpaid") {
    res.status(409).json({ error: "Cannot dispute an unpaid order" });
    return;
  }

  // Check for existing open dispute
  const [existing] = await db
    .select()
    .from(disputesTable)
    .where(and(
      eq(disputesTable.orderId, parsed.data.orderId),
      eq(disputesTable.userId, req.userId!),
    ));

  if (existing && ["open", "under_review"].includes(existing.status)) {
    res.status(409).json({ error: "You already have an open dispute for this order" });
    return;
  }

  const [dispute] = await db
    .insert(disputesTable)
    .values({
      orderId: parsed.data.orderId,
      userId: req.userId!,
      reason: parsed.data.reason,
      description: parsed.data.description,
      evidenceUrls: parsed.data.evidenceUrls,
      status: "open",
    })
    .returning();

  // Notify admins (via a system user or the seller's business owner)
  try {
    const [biz] = await db
      .select({ ownerId: businessesTable.ownerId })
      .from(businessesTable)
      .where(eq(businessesTable.id, order.businessId));
    if (biz?.ownerId) {
      await db.insert(notificationsTable).values({
        userId: biz.ownerId,
        type: "order_update",
        title: `Dispute raised on Order #${order.id}`,
        body: `A buyer has raised a dispute: "${parsed.data.reason.replace(/_/g, " ")}". Our team will review it.`,
        relatedId: order.id,
        isRead: false,
      });
    }
  } catch {}

  res.status(201).json(dispute);
});

// Buyer: get my disputes
router.get("/disputes", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const disputes = await db
    .select()
    .from(disputesTable)
    .where(eq(disputesTable.userId, req.userId!))
    .orderBy(desc(disputesTable.createdAt));
  res.json(disputes);
});

// Get single dispute (owner or admin)
router.get("/disputes/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  // Validation middleware injected elsewhere for DisputeParams); return; }

  const [dispute] = await db.select().from(disputesTable).where(eq(disputesTable.id, params.data.id));
  if (!dispute) { res.status(404).json({ error: "Dispute not found" }); return; }

  if (req.userRole !== "admin" && dispute.userId !== req.userId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  res.json(dispute);
});

// Admin: list all disputes
router.get("/admin/disputes", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const disputes = await db
    .select()
    .from(disputesTable)
    .orderBy(desc(disputesTable.createdAt));
  res.json(disputes);
});

// Admin: update dispute status (mark under review)
router.patch("/admin/disputes/:id/review", requireAuth, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  // Validation middleware injected elsewhere for DisputeParams); return; }

  const [dispute] = await db.select().from(disputesTable).where(eq(disputesTable.id, params.data.id));
  if (!dispute) { res.status(404).json({ error: "Dispute not found" }); return; }

  const [updated] = await db
    .update(disputesTable)
    .set({ status: "under_review", updatedAt: new Date() })
    .where(eq(disputesTable.id, params.data.id))
    .returning();

  // Notify buyer
  try {
    await db.insert(notificationsTable).values({
      userId: dispute.userId,
      type: "order_update",
      title: `Dispute #${dispute.id} under review`,
      body: "Your dispute is now under review by our support team. We'll update you shortly.",
      relatedId: dispute.orderId,
      isRead: false,
    });
  } catch {}

  res.json(updated);
});

// Admin: resolve dispute
router.patch("/admin/disputes/:id/resolve", requireAuth, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  // Validation middleware injected elsewhere for DisputeParams); return; }

  // Validation middleware injected elsewhere for ResolveDisputeBody); return; }
  if (parsed.data.processRefund && parsed.data.releasePayout) {
    res.status(400).json({ error: "Choose either refund or payout release, not both" });
    return;
  }

  const [dispute] = await db.select().from(disputesTable).where(eq(disputesTable.id, params.data.id));
  if (!dispute) { res.status(404).json({ error: "Dispute not found" }); return; }
  if (!["open", "under_review"].includes(dispute.status)) {
    res.status(409).json({ error: "Dispute is already resolved" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, dispute.orderId));
  if (!order) { res.status(404).json({ error: "Associated order not found" }); return; }

  const [updated] = await db
    .update(disputesTable)
    .set({
      status: parsed.data.status,
      resolution: parsed.data.resolution,
      adminNote: parsed.data.adminNote,
      resolvedBy: req.userId!,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(disputesTable.id, params.data.id))
    .returning();

  // Process escrow action based on resolution
  if (parsed.data.processRefund && order.paymentStatus === "in_escrow") {
    await db
      .update(ordersTable)
      .set({ paymentStatus: "refunded", status: "cancelled", updatedAt: new Date() })
      .where(eq(ordersTable.id, dispute.orderId));

    await db.insert(transactionsTable).values({
      orderId: order.id,
      userId: order.userId,
      type: "refund",
      amount: (order.totalPrice / 100).toString(),
      currency: "GHS",
      provider: "system",
      providerRef: `REFUND-DISPUTE-${dispute.id}-${Date.now()}`,
      status: "success",
      metadata: { disputeId: dispute.id, resolution: parsed.data.status },
    });
  } else if (parsed.data.releasePayout && order.paymentStatus === "in_escrow") {
    await db
      .update(ordersTable)
      .set({ paymentStatus: "released", updatedAt: new Date() })
      .where(eq(ordersTable.id, dispute.orderId));

    await db.insert(transactionsTable).values({
      orderId: order.id,
      userId: req.userId!,
      type: "payout",
      amount: (order.totalPrice / 100).toString(),
      currency: "GHS",
      provider: "system",
      providerRef: `PAYOUT-DISPUTE-${dispute.id}-${Date.now()}`,
      status: "success",
      metadata: { disputeId: dispute.id, resolution: parsed.data.status },
    });
  }

  // Notify both parties
  try {
    const isBuyerWin = parsed.data.status === "resolved_buyer";
    await db.insert(notificationsTable).values({
      userId: dispute.userId,
      type: "order_update",
      title: `Dispute #${dispute.id} resolved`,
      body: isBuyerWin
        ? `Your dispute has been resolved in your favour. ${parsed.data.processRefund ? "A refund will be processed." : ""}`
        : `Your dispute has been reviewed. ${parsed.data.resolution}`,
      relatedId: dispute.orderId,
      isRead: false,
    });

    const [biz] = await db
      .select({ ownerId: businessesTable.ownerId })
      .from(businessesTable)
      .where(eq(businessesTable.id, order.businessId));
    if (biz?.ownerId) {
      await db.insert(notificationsTable).values({
        userId: biz.ownerId,
        type: "order_update",
        title: `Dispute resolved for Order #${order.id}`,
        body: parsed.data.status === "resolved_seller"
          ? `The dispute for Order #${order.id} has been resolved in your favour.`
          : `The dispute for Order #${order.id} has been resolved. ${parsed.data.processRefund ? "The buyer has been refunded." : ""}`,
        relatedId: dispute.orderId,
        isRead: false,
      });
    }
  } catch {}

  res.json(updated);
});

export default router;
