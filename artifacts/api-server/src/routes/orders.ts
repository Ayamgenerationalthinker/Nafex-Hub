import { Router, type IRouter } from "express";
import { db, ordersTable, businessesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

const OrderItemSchema = z.object({
  name: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().int().nonnegative(),
});

const CreateOrderBody = z.object({
  businessId: z.number().int().positive(),
  items: z.array(OrderItemSchema).min(1),
  totalPrice: z.number().int().nonnegative(),
  notes: z.string().optional(),
});

const OrderParams = z.object({
  id: z.coerce.number().int().positive(),
});

const UpdateStatusBody = z.object({
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]),
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

router.post("/orders", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [order] = await db
    .insert(ordersTable)
    .values({
      userId: req.userId!,
      businessId: parsed.data.businessId,
      items: parsed.data.items,
      totalPrice: parsed.data.totalPrice,
      notes: parsed.data.notes,
      status: "pending",
    })
    .returning();

  res.status(201).json(order);
});

router.get("/orders/user", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, req.userId!))
    .orderBy(desc(ordersTable.createdAt));

  const withDetails = await attachBusinessDetails(orders);
  res.json(withDetails);
});

router.get("/orders/business", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  // Get the business(es) owned by this user
  const businesses = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, req.userId!));

  if (businesses.length === 0) {
    res.json([]);
    return;
  }

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

router.patch("/orders/:id/status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = OrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [order] = await db
    .update(ordersTable)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(ordersTable.id, params.data.id))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(order);
});

export default router;
