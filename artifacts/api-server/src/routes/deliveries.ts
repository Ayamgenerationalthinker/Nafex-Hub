import { Router, type IRouter } from "express";
import { db, deliveriesTable, deliveryEventsTable, ridersTable, ordersTable, businessesTable, notificationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, optionalAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

function generateTrackingCode(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `NAF-${date}-${rand}`;
}

function calculateDeliveryFee(zone: string | undefined): number {
  const fees: Record<string, number> = {
    accra_central: 15,
    accra_east:    20,
    accra_west:    20,
    tema:          25,
    kumasi:        50,
    takoradi:      60,
    tamale:        80,
    default:       30,
  };
  return fees[zone?.toLowerCase() ?? "default"] ?? fees["default"]!;
}

const CreateDeliveryBody = z.object({
  orderId: z.number().int().positive(),
  pickupAddress: z.string().min(1),
  deliveryAddress: z.string().min(1),
  deliveryZone: z.string().optional(),
  notes: z.string().optional(),
  estimatedArrival: z.string().datetime().optional(),
});

const UpdateStatusBody = z.object({
  status: z.enum(["assigned", "picked_up", "in_transit", "delivered", "failed", "returned"]),
  note: z.string().optional(),
  location: z.string().optional(),
});

const AssignRiderBody = z.object({ riderId: z.number().int().positive() });

const DeliveryParams = z.object({ id: z.coerce.number().int().positive() });
const TrackingParams = z.object({ code: z.string().min(1) });

function requireAdmin(req: AuthRequest, res: Parameters<typeof requireAuth>[1], next: Parameters<typeof requireAuth>[2]): void {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

// Attach rider & events to a delivery
async function enrichDelivery(delivery: typeof deliveriesTable.$inferSelect) {
  const events = await db
    .select()
    .from(deliveryEventsTable)
    .where(eq(deliveryEventsTable.deliveryId, delivery.id))
    .orderBy(deliveryEventsTable.createdAt);

  let rider = null;
  if (delivery.riderId) {
    const [r] = await db.select().from(ridersTable).where(eq(ridersTable.id, delivery.riderId));
    rider = r ?? null;
  }

  return { ...delivery, events, rider };
}

// Create delivery (seller or admin)
router.post("/deliveries", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateDeliveryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, parsed.data.orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  // Only seller who owns this order's business, or admin, can create delivery
  if (req.userRole !== "admin") {
    const [biz] = await db
      .select({ ownerId: businessesTable.ownerId })
      .from(businessesTable)
      .where(eq(businessesTable.id, order.businessId));
    if (!biz || biz.ownerId !== req.userId) {
      res.status(403).json({ error: "Only the seller or admin can create a delivery" });
      return;
    }
  }

  // Prevent duplicate deliveries for same order
  const [existing] = await db
    .select()
    .from(deliveriesTable)
    .where(eq(deliveriesTable.orderId, parsed.data.orderId));
  if (existing) { res.status(409).json({ error: "Delivery already exists for this order" }); return; }

  const zone = parsed.data.deliveryZone;
  const fee = calculateDeliveryFee(zone);
  const trackingCode = generateTrackingCode();

  const [delivery] = await db
    .insert(deliveriesTable)
    .values({
      orderId: parsed.data.orderId,
      trackingCode,
      pickupAddress: parsed.data.pickupAddress,
      deliveryAddress: parsed.data.deliveryAddress,
      deliveryZone: zone,
      deliveryFee: fee.toString(),
      notes: parsed.data.notes,
      estimatedArrival: parsed.data.estimatedArrival ? new Date(parsed.data.estimatedArrival) : undefined,
      status: "created",
    })
    .returning();

  // Log initial event
  await db.insert(deliveryEventsTable).values({
    deliveryId: delivery.id,
    status: "created",
    note: "Delivery created and awaiting rider assignment",
  });

  // Notify the buyer
  try {
    await db.insert(notificationsTable).values({
      userId: order.userId,
      type: "order_update",
      title: `Delivery created for Order #${order.id}`,
      body: `Your tracking code is ${trackingCode}. You can track your order in real-time.`,
      relatedId: order.id,
      isRead: false,
    });
  } catch {}

  res.status(201).json(await enrichDelivery(delivery));
});

// Public tracking by code (no auth required)
router.get("/deliveries/track/:code", optionalAuth, async (req, res): Promise<void> => {
  const params = TrackingParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid tracking code" }); return; }

  const [delivery] = await db
    .select()
    .from(deliveriesTable)
    .where(eq(deliveriesTable.trackingCode, params.data.code));

  if (!delivery) { res.status(404).json({ error: "Tracking code not found" }); return; }

  // Attach order info (non-sensitive)
  const [order] = await db
    .select({
      id: ordersTable.id,
      status: ordersTable.status,
      businessId: ordersTable.businessId,
    })
    .from(ordersTable)
    .where(eq(ordersTable.id, delivery.orderId));

  let businessName: string | null = null;
  if (order) {
    const [biz] = await db
      .select({ name: businessesTable.name })
      .from(businessesTable)
      .where(eq(businessesTable.id, order.businessId));
    businessName = biz?.name ?? null;
  }

  const enriched = await enrichDelivery(delivery);
  res.json({ ...enriched, businessName });
});

// Get delivery by order ID (auth required)
router.get("/deliveries/order/:orderId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = z.object({ orderId: z.coerce.number().int().positive() }).safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid order id" }); return; }

  const [delivery] = await db
    .select()
    .from(deliveriesTable)
    .where(eq(deliveriesTable.orderId, params.data.orderId));

  if (!delivery) { res.status(404).json({ error: "No delivery found for this order" }); return; }

  res.json(await enrichDelivery(delivery));
});

// Fee estimate (public — must be before /:id)
router.get("/deliveries/fee-estimate", async (req, res): Promise<void> => {
  const zone = (req.query["zone"] as string | undefined);
  const fee = calculateDeliveryFee(zone);
  res.json({ zone: zone ?? "default", fee, currency: "GHS" });
});

// Get single delivery (auth required)
router.get("/deliveries/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DeliveryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid delivery id" }); return; }

  const [delivery] = await db
    .select()
    .from(deliveriesTable)
    .where(eq(deliveriesTable.id, params.data.id));

  if (!delivery) { res.status(404).json({ error: "Delivery not found" }); return; }

  res.json(await enrichDelivery(delivery));
});

// Update delivery status (admin or assigned rider)
router.patch("/deliveries/:id/status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = DeliveryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid delivery id" }); return; }

  const parsed = UpdateStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [delivery] = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, params.data.id));
  if (!delivery) { res.status(404).json({ error: "Delivery not found" }); return; }

  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required to update delivery status" });
    return;
  }

  const [updated] = await db
    .update(deliveriesTable)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(deliveriesTable.id, params.data.id))
    .returning();

  await db.insert(deliveryEventsTable).values({
    deliveryId: delivery.id,
    status: parsed.data.status,
    note: parsed.data.note,
    location: parsed.data.location,
  });

  // Notify buyer on key status changes
  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, delivery.orderId));
    if (order) {
      const labels: Record<string, string> = {
        picked_up:  "picked up by the rider",
        in_transit: "on its way to you",
        delivered:  "delivered successfully",
        failed:     "delivery failed — our team will follow up",
        returned:   "returned to sender",
      };
      const label = labels[parsed.data.status];
      if (label) {
        await db.insert(notificationsTable).values({
          userId: order.userId,
          type: "order_update",
          title: `Delivery update for Order #${order.id}`,
          body: `Your package is ${label}. Tracking: ${delivery.trackingCode}`,
          relatedId: order.id,
          isRead: false,
        });
      }
    }
  } catch {}

  res.json(await enrichDelivery(updated));
});

// Assign rider (admin)
router.patch("/deliveries/:id/assign", requireAuth, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const params = DeliveryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid delivery id" }); return; }

  const parsed = AssignRiderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [delivery] = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, params.data.id));
  if (!delivery) { res.status(404).json({ error: "Delivery not found" }); return; }

  const [rider] = await db.select().from(ridersTable).where(and(
    eq(ridersTable.id, parsed.data.riderId),
    eq(ridersTable.isActive, true),
  ));
  if (!rider) { res.status(404).json({ error: "Rider not found or inactive" }); return; }

  const [updated] = await db
    .update(deliveriesTable)
    .set({ riderId: parsed.data.riderId, status: "assigned", updatedAt: new Date() })
    .where(eq(deliveriesTable.id, params.data.id))
    .returning();

  await db.insert(deliveryEventsTable).values({
    deliveryId: delivery.id,
    status: "assigned",
    note: `Assigned to ${rider.name} (${rider.phone})`,
  });

  // Mark rider as busy
  await db
    .update(ridersTable)
    .set({ isAvailable: false, updatedAt: new Date() })
    .where(eq(ridersTable.id, parsed.data.riderId));

  res.json(await enrichDelivery(updated));
});

// Admin: list all deliveries
router.get("/admin/deliveries", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const deliveries = await db
    .select()
    .from(deliveriesTable)
    .orderBy(desc(deliveriesTable.createdAt));

  const enriched = await Promise.all(deliveries.map(enrichDelivery));
  res.json(enriched);
});

export default router;
