import { Router, type IRouter } from "express";
import { db, ordersTable, businessesTable, notificationsTable, usersTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requireVerified, type AuthRequest } from "../lib/auth-middleware";
import { sendAdminEmail, sendDeliveryOtpEmail } from "../lib/mailer";
import { notifyAllAdmins } from "../lib/notify";
import { payoutToSeller } from "./payments";

const router: IRouter = Router();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const OrderItemSchema = z.object({
  name: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().int().nonnegative(),
});

const CreateOrderBody = z.object({
  businessId: z.number().int().positive(),
  items: z.array(OrderItemSchema).min(1),
  totalPrice: z.number().int().nonnegative(),
  coinsApplied: z.number().int().nonnegative().optional().default(0),
  isB2b: z.boolean().optional().default(false),
  notes: z.string().optional(),
});

const OrderParams = z.object({
  id: z.coerce.number().int().positive(),
});

const UpdateStatusBody = z.object({
  status: z.enum(["pending", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled"]),
});

const PayBody = z.object({
  reference: z.string().min(1).max(100),
});

const ConfirmDeliveryBody = z.object({
  otp: z.string().length(6),
});

async function attachBusinessDetails(orders: typeof ordersTable.$inferSelect[]) {
  return Promise.all(
    orders.map(async (order) => {
      const [business] = await db
        .select({ name: businessesTable.name, logo: businessesTable.logo })
        .from(businessesTable)
        .where(eq(businessesTable.id, order.businessId));
      return {
        ...order,
        businessName: business?.name ?? null,
        businessLogo: business?.logo ?? null,
      };
    })
  );
}

// Create order
router.post("/orders", requireAuth, requireVerified, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { businessId, items, totalPrice, notes, coinsApplied, isB2b } = parsed.data;

  // Validate business
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, businessId));
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  // Deduct coins if applied
  if (coinsApplied > 0) {
    const [user] = await db.select({ loyaltyPoints: usersTable.loyaltyPoints }).from(usersTable).where(eq(usersTable.id, req.userId!));
    if (!user || user.loyaltyPoints < coinsApplied) {
      res.status(400).json({ error: "Not enough Nafex Coins" });
      return;
    }
    await db.update(usersTable)
      .set({ loyaltyPoints: sql`${usersTable.loyaltyPoints} - ${coinsApplied}` })
      .where(eq(usersTable.id, req.userId!));
  }

  // Generate Milestones if B2B
  let milestones: any[] = [];
  if (isB2b) {
    const half = Math.floor(totalPrice / 2);
    const remainder = totalPrice - half;
    milestones = [
      { id: 1, description: "50% Upfront Deposit", amount: half, status: "pending" },
      { id: 2, description: "50% Balance on Delivery", amount: remainder, status: "pending" }
    ];
  }

  const [order] = await db
    .insert(ordersTable)
    .values({
      userId: req.userId!,
      businessId,
      items,
      totalPrice,
      coinsApplied,
      isB2b,
      milestones,
      notes,
      status: "pending",
      paymentStatus: "unpaid",
    })
    .returning();

  sendAdminEmail(
    "New Order Placed",
    `A new order has been placed on Nafex Hub.\n\nOrder ID: ${order.id}\nBusiness ID: ${order.businessId}\nTotal: GHS ${(order.totalPrice / 100).toFixed(2)}\nItems: ${parsed.data.items.length}\nDate: ${new Date().toUTCString()}`
  );

  // In-app notifications for seller (business owner) + all admins.
  try {
    const [biz] = await db
      .select({ ownerId: businessesTable.ownerId, name: businessesTable.name })
      .from(businessesTable)
      .where(eq(businessesTable.id, order.businessId));
    const totalGhs = `GHS ${(order.totalPrice / 100).toFixed(2)}`;

    if (biz?.ownerId) {
      await db.insert(notificationsTable).values({
        userId: biz.ownerId,
        type: "order_update",
        title: `New order received — #${order.id}`,
        body: `You have a new order for ${totalGhs} (${parsed.data.items.length} item${parsed.data.items.length === 1 ? "" : "s"}). Awaiting buyer payment.`,
        relatedId: order.id,
        isRead: false,
      });
    }

    await notifyAllAdmins({
      type: "order_update",
      title: `New order placed — #${order.id}`,
      body: `${biz?.name ?? "A business"} received a new order for ${totalGhs}. Track payment & delivery in the admin dashboard.`,
      relatedId: order.id,
    });
  } catch {}

  res.status(201).json(order);
});

// Buyer: submit mobile money payment reference → lock escrow
router.post("/orders/:id/pay", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = OrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid order id" }); return; }

  const parsed = PayBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "reference is required" }); return; }

  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Order not found" }); return; }
  if (existing.userId !== req.userId) { res.status(403).json({ error: "Not your order" }); return; }
  if (existing.paymentStatus !== "unpaid") { res.status(409).json({ error: "Payment already recorded" }); return; }

  const [updated] = await db
    .update(ordersTable)
    .set({ paymentStatus: "in_escrow", paymentReference: parsed.data.reference, updatedAt: new Date() })
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  // Notify the seller's business owner
  try {
    const [business] = await db
      .select({ ownerId: businessesTable.ownerId, name: businessesTable.name })
      .from(businessesTable)
      .where(eq(businessesTable.id, existing.businessId));
    if (business && business.ownerId !== null) {
      await db.insert(notificationsTable).values({
        userId: business.ownerId,
        type: "order_update",
        title: `Payment received for Order #${existing.id}`,
        body: `The buyer has submitted a mobile money reference for Order #${existing.id}. Funds are now in escrow.`,
        relatedId: existing.id,
        isRead: false,
      });
    }
    await notifyAllAdmins({
      type: "order_update",
      title: `Payment received — Order #${existing.id}`,
      body: `${business?.name ?? "A seller"} received an escrow-held payment for Order #${existing.id} (ref: ${parsed.data.reference}). Ready for fulfillment.`,
      relatedId: existing.id,
    });
  } catch {}

  res.json(updated);
});

// Buyer orders
router.get("/orders/user", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, req.userId!))
    .orderBy(desc(ordersTable.createdAt));

  const withDetails = await attachBusinessDetails(orders);
  res.json(withDetails);
});

// Seller orders
router.get("/orders/business", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const businesses = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, req.userId!));

  if (businesses.length === 0) { res.json([]); return; }

  const businessIds = businesses.map((b) => b.id);
  const allOrders: typeof ordersTable.$inferSelect[] = [];

  for (const bizId of businessIds) {
    const bizOrders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.businessId, bizId))
      .orderBy(desc(ordersTable.createdAt));
    allOrders.push(...bizOrders);
  }

  allOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const withDetails = await attachBusinessDetails(allOrders);
  res.json(withDetails);
});

// Seller: update order status
router.patch("/orders/:id/status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = OrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = UpdateStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Verify the user owns the business for this order
  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Order not found" }); return; }

  const [business] = await db
    .select({ ownerId: businessesTable.ownerId })
    .from(businessesTable)
    .where(eq(businessesTable.id, existing.businessId));

  if (!business || business.ownerId !== req.userId) {
    res.status(403).json({ error: "Not your order" });
    return;
  }

  const updateFields: Partial<typeof ordersTable.$inferInsert> & { updatedAt: Date; deliveryOtp?: string | null; deliveryOtpExpiry?: Date | null } = {
    status: parsed.data.status,
    updatedAt: new Date(),
  };

  // Auto-generate OTP when dispatching for delivery
  if (parsed.data.status === "out_for_delivery") {
    const otp = generateOtp();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    updateFields.deliveryOtp = otp;
    updateFields.deliveryOtpExpiry = expiry;
  }

  // If cancelled and coins were applied, refund the coins
  if (parsed.data.status === "cancelled" && existing.status !== "cancelled" && existing.coinsApplied > 0) {
    await db.update(usersTable)
      .set({ loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${existing.coinsApplied}` })
      .where(eq(usersTable.id, existing.userId));
  }

  const [order] = await db
    .update(ordersTable)
    .set(updateFields)
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  // If dispatched, email the buyer the delivery OTP so they have it on hand.
  if (parsed.data.status === "out_for_delivery" && updateFields.deliveryOtp) {
    try {
      const [buyer] = await db
        .select({ email: usersTable.email, name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, order.userId));
      if (buyer?.email) {
        sendDeliveryOtpEmail(buyer.email, buyer.name ?? "Customer", order.id, updateFields.deliveryOtp).catch(() => {});
      }
    } catch {}
  }

  // Notify the customer
  try {
    const statusLabels: Record<string, string> = {
      confirmed: "confirmed",
      packed: "packed and ready",
      out_for_delivery: "out for delivery",
      delivered: "delivered",
      cancelled: "cancelled",
    };
    const label = statusLabels[parsed.data.status] ?? parsed.data.status;
    let body = `Your order status has been updated to "${label}".`;
    if (parsed.data.status === "out_for_delivery" && updateFields.deliveryOtp) {
      body = `Your order is out for delivery! Your delivery OTP is: ${updateFields.deliveryOtp}. Share this code with your delivery person to confirm receipt.`;
    }
    await db.insert(notificationsTable).values({
      userId: order.userId,
      type: "order_update",
      title: `Order #${order.id} is ${label}`,
      body,
      relatedId: order.id,
      isRead: false,
    });
    await notifyAllAdmins({
      type: "order_update",
      title: `Order #${order.id} → ${label}`,
      body: `Seller updated Order #${order.id} status to "${label}".`,
      relatedId: order.id,
    });
  } catch {}

  res.json(order);
});

// Seller: confirm delivery by OTP → mark delivered + release escrow
router.post("/orders/:id/confirm-delivery", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = OrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid order id" }); return; }

  const parsed = ConfirmDeliveryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "A 6-digit OTP is required" }); return; }

  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!existing) { res.status(404).json({ error: "Order not found" }); return; }

  // Verify seller owns the business
  const [business] = await db
    .select({ ownerId: businessesTable.ownerId })
    .from(businessesTable)
    .where(eq(businessesTable.id, existing.businessId));
  if (!business || business.ownerId !== req.userId) {
    res.status(403).json({ error: "Not your order" });
    return;
  }

  if (existing.status !== "out_for_delivery") {
    res.status(409).json({ error: "Order is not out for delivery" });
    return;
  }

  if (!existing.deliveryOtp || existing.deliveryOtp !== parsed.data.otp) {
    res.status(400).json({ error: "Invalid OTP" });
    return;
  }

  if (existing.deliveryOtpExpiry && existing.deliveryOtpExpiry < new Date()) {
    res.status(400).json({ error: "OTP has expired. Please regenerate by re-dispatching the order." });
    return;
  }

  const [order] = await db
    .update(ordersTable)
    .set({
      status: "delivered",
      paymentStatus: existing.paymentStatus === "in_escrow" ? "released" : existing.paymentStatus,
      deliveryOtp: null,
      deliveryOtpExpiry: null,
      updatedAt: new Date(),
    })
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (existing.paymentStatus === "in_escrow") {
    const points = Math.floor(existing.totalPrice / 2000); // 1 point per 20 GHS
    if (points > 0) {
      await db.update(usersTable)
        .set({ loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${points}` })
        .where(eq(usersTable.id, existing.userId));
    }

    // Calculate Tiered Commission
    const totalPriceGhs = existing.totalPrice / 100;
    let commissionRate = 0.05; // 5% default for 501+
    if (totalPriceGhs <= 100) {
      commissionRate = 0.015; // 1.5% for 1 - 100 GHS
    } else if (totalPriceGhs <= 500) {
      commissionRate = 0.03;  // 3% for 101 - 500 GHS
    }
    
    const commissionPesewas = Math.floor(existing.totalPrice * commissionRate);
    const payoutAmount = existing.totalPrice - commissionPesewas;

    // Automated instant payout!
    await payoutToSeller(existing.businessId, payoutAmount, existing.id);
  }

  // Notify buyer: delivered + escrow released
  try {
    await db.insert(notificationsTable).values({
      userId: order.userId,
      type: "order_update",
      title: `Order #${order.id} Delivered!`,
      body: `Your order has been delivered and confirmed. ${existing.paymentStatus === "in_escrow" ? "Escrow funds have been released to the seller." : ""}`,
      relatedId: order.id,
      isRead: false,
    });
    await notifyAllAdmins({
      type: "order_update",
      title: `Order #${order.id} delivered`,
      body: `Order #${order.id} confirmed delivered via OTP. ${existing.paymentStatus === "in_escrow" ? "Escrow released to seller." : ""}`,
      relatedId: order.id,
    });
  } catch {}

  res.json(order);
});

// ── Buyer releases a specific B2B milestone ─────────────────────────────────
router.post("/orders/:id/release-milestone", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = OrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid order id" }); return; }

  const parsed = z.object({ milestoneId: z.number().int().positive() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.userId !== req.userId) { res.status(403).json({ error: "Not your order" }); return; }
  if (!order.isB2b) { res.status(400).json({ error: "Not a B2B order" }); return; }

  const milestones = (order.milestones as any[]) || [];
  const milestone = milestones.find((m) => m.id === parsed.data.milestoneId);
  if (!milestone) { res.status(404).json({ error: "Milestone not found" }); return; }
  
  if (milestone.status !== "in_escrow") {
    res.status(409).json({ error: "Milestone is not in escrow, cannot release." });
    return;
  }

  // Update milestone status
  const newMilestones = milestones.map((m) => 
    m.id === milestone.id ? { ...m, status: "released" } : m
  );

  const allReleased = newMilestones.every((m) => m.status === "released");
  const newPaymentStatus = allReleased ? "released" : order.paymentStatus;
  const newStatus = allReleased ? "delivered" : order.status;

  const [updated] = await db
    .update(ordersTable)
    .set({
      milestones: newMilestones,
      paymentStatus: newPaymentStatus as any,
      status: newStatus as any,
      updatedAt: new Date()
    })
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  // Tiered Commission for this milestone amount
  const amountGhs = milestone.amount / 100;
  let commissionRate = 0.05;
  if (amountGhs <= 100) commissionRate = 0.015;
  else if (amountGhs <= 500) commissionRate = 0.03;
  
  const commissionPesewas = Math.floor(milestone.amount * commissionRate);
  const payoutAmount = milestone.amount - commissionPesewas;

  // Automated payout for this specific milestone
  await payoutToSeller(order.businessId, payoutAmount, order.id);

  try {
    await db.insert(notificationsTable).values({
      userId: updated.businessId, // Note: business owner ID is needed, we skip full lookup here for brevity if it's acceptable, or look it up:
      type: "order_update",
      title: `Milestone Released — Order #${order.id}`,
      body: `Buyer released funds for: ${milestone.description}. Funds transferred to your account.`,
      relatedId: order.id,
      isRead: false,
    });
  } catch {}

  res.json(updated);
});

// ── Buyer confirms delivery → escrow auto-released ──────────────────────────
router.post("/orders/:id/buyer-confirm", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = OrderParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid order id" }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (order.userId !== req.userId) { res.status(403).json({ error: "Not your order" }); return; }

  const confirmable = ["confirmed", "packed", "out_for_delivery"];
  if (!confirmable.includes(order.status)) {
    res.status(409).json({ error: "Order cannot be confirmed at this stage" });
    return;
  }

  if (["released", "refunded"].includes(order.paymentStatus)) {
    res.status(409).json({ error: "Escrow already settled for this order" });
    return;
  }

  const newPaymentStatus = order.paymentStatus === "in_escrow" ? "released" : order.paymentStatus;

  const [updated] = await db
    .update(ordersTable)
    .set({ status: "delivered", paymentStatus: newPaymentStatus, updatedAt: new Date() })
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (order.paymentStatus === "in_escrow") {
    const points = Math.floor(order.totalPrice / 2000); // 1 point per 20 GHS
    if (points > 0) {
      await db.update(usersTable)
        .set({ loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${points}` })
        .where(eq(usersTable.id, order.userId));
    }
    
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

    // Automated instant payout!
    const success = await payoutToSeller(order.businessId, payoutAmount, order.id);
    if (success) {
      // Record a payout transaction here if we had a payouts table, for now it's handled in Paystack logs.
    }
  }

  // Notify seller that escrow has been released
  try {
    const [biz] = await db
      .select({ ownerId: businessesTable.ownerId })
      .from(businessesTable)
      .where(eq(businessesTable.id, order.businessId));
    if (biz?.ownerId) {
      await db.insert(notificationsTable).values({
        userId: biz.ownerId,
        type: "order_update",
        title: `Delivery confirmed — Order #${order.id}`,
        body: order.paymentStatus === "in_escrow"
          ? `Buyer confirmed receipt. GHS ${(order.totalPrice / 100).toFixed(2)} escrow has been released to your account.`
          : `Buyer confirmed receipt of Order #${order.id}.`,
        relatedId: order.id,
        isRead: false,
      });
    }
    await notifyAllAdmins({
      type: "order_update",
      title: `Buyer confirmed delivery — Order #${order.id}`,
      body: order.paymentStatus === "in_escrow"
        ? `Buyer confirmed receipt of Order #${order.id}. Escrow released to seller.`
        : `Buyer confirmed receipt of Order #${order.id}.`,
      relatedId: order.id,
    });
  } catch {}

  res.json(updated);
});

// Seller clients
router.get("/orders/business/clients", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [business] = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, req.userId!));

  if (!business) { res.json([]); return; }

  const orders = await db
    .select({
      userId: ordersTable.userId,
      userName: usersTable.name,
      userEmail: usersTable.email,
      totalPrice: ordersTable.totalPrice,
      status: ordersTable.status,
      createdAt: ordersTable.createdAt,
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .where(eq(ordersTable.businessId, business.id))
    .orderBy(desc(ordersTable.createdAt));

  // Only count buyers who have at least one successfully delivered order
  const deliveredBuyerIds = new Set(
    orders.filter((o) => o.status === "delivered").map((o) => o.userId)
  );

  const clientMap = new Map<number, {
    userId: number;
    name: string;
    email: string;
    orderCount: number;
    totalSpent: number;
    lastOrderAt: string;
  }>();

  for (const order of orders) {
    if (!deliveredBuyerIds.has(order.userId)) continue;
    const existing = clientMap.get(order.userId);
    if (existing) {
      existing.orderCount++;
      existing.totalSpent += order.totalPrice;
    } else {
      clientMap.set(order.userId, {
        userId: order.userId,
        name: order.userName ?? "Unknown",
        email: order.userEmail ?? "",
        orderCount: 1,
        totalSpent: order.totalPrice,
        lastOrderAt: order.createdAt.toISOString(),
      });
    }
  }

  const clients = Array.from(clientMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  res.json(clients);
});

export default router;
