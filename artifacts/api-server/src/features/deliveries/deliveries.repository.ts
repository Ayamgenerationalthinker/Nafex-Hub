import { db, deliveriesTable, deliveryEventsTable, ridersTable, ordersTable, businessesTable, notificationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { InferInsertModel } from "drizzle-orm";

type NewDelivery = InferInsertModel<typeof deliveriesTable>;

export class DeliveriesRepository {
  public async getOrderAndBusiness(orderId: number) {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order) return { order: null, business: null };

    const [business] = await db
      .select()
      .from(businessesTable)
      .where(eq(businessesTable.id, order.businessId));
    
    return { order, business };
  }

  public async getDeliveryByOrderId(orderId: number) {
    const [delivery] = await db
      .select()
      .from(deliveriesTable)
      .where(eq(deliveriesTable.orderId, orderId));
    return delivery;
  }

  public async getDeliveryByTrackingCode(code: string) {
    const [delivery] = await db
      .select()
      .from(deliveriesTable)
      .where(eq(deliveriesTable.trackingCode, code));
    return delivery;
  }

  public async getDeliveryById(id: number) {
    const [delivery] = await db
      .select()
      .from(deliveriesTable)
      .where(eq(deliveriesTable.id, id));
    return delivery;
  }

  public async getRider(riderId: number) {
    const [rider] = await db.select().from(ridersTable).where(eq(ridersTable.id, riderId));
    return rider;
  }

  public async createDelivery(data: NewDelivery) {
    const [delivery] = await db.insert(deliveriesTable).values(data).returning();
    return delivery;
  }

  public async createDeliveryEvent(deliveryId: number, status: string, note?: string, location?: string) {
    await db.insert(deliveryEventsTable).values({
      deliveryId,
      status,
      note,
      location,
    });
  }

  public async updateDelivery(id: number, data: Partial<NewDelivery>) {
    const [updated] = await db
      .update(deliveriesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(deliveriesTable.id, id))
      .returning();
    return updated;
  }

  public async setRiderAvailability(riderId: number, isAvailable: boolean) {
    await db.update(ridersTable).set({ isAvailable }).where(eq(ridersTable.id, riderId));
  }

  public async enrichDelivery(delivery: typeof deliveriesTable.$inferSelect) {
    const events = await db
      .select()
      .from(deliveryEventsTable)
      .where(eq(deliveryEventsTable.deliveryId, delivery.id))
      .orderBy(deliveryEventsTable.createdAt);

    let rider = null;
    if (delivery.riderId) {
      rider = await this.getRider(delivery.riderId);
    }

    return { ...delivery, events, rider };
  }

  public async getAllDeliveries() {
    return await db.select().from(deliveriesTable).orderBy(desc(deliveriesTable.createdAt));
  }

  public async createNotification(userId: number, type: string, title: string, body: string, relatedId: number) {
    await db.insert(notificationsTable).values({
      userId,
      type,
      title,
      body,
      relatedId,
      isRead: false,
    });
  }
}
