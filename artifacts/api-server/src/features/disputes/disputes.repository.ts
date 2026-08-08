import { db, disputesTable, ordersTable, transactionsTable, businessesTable, notificationsTable } from "@workspace/db";
import { eq, desc, and, InferInsertModel } from "drizzle-orm";

type NewDispute = InferInsertModel<typeof disputesTable>;

export class DisputesRepository {
  public async getOrderById(orderId: number) {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    return order;
  }

  public async getDispute(orderId: number, userId: number) {
    const [existing] = await db
      .select()
      .from(disputesTable)
      .where(and(
        eq(disputesTable.orderId, orderId),
        eq(disputesTable.userId, userId),
      ));
    return existing;
  }

  public async getDisputeById(disputeId: number) {
    const [dispute] = await db.select().from(disputesTable).where(eq(disputesTable.id, disputeId));
    return dispute;
  }

  public async createDispute(data: NewDispute) {
    const [dispute] = await db.insert(disputesTable).values(data).returning();
    return dispute;
  }

  public async getUserDisputes(userId: number) {
    return await db
      .select()
      .from(disputesTable)
      .where(eq(disputesTable.userId, userId))
      .orderBy(desc(disputesTable.createdAt));
  }

  public async getAllDisputes() {
    return await db
      .select()
      .from(disputesTable)
      .orderBy(desc(disputesTable.createdAt));
  }

  public async updateDisputeStatus(id: number, status: any, updateFields: any = {}) {
    const [updated] = await db
      .update(disputesTable)
      .set({ status, updatedAt: new Date(), ...updateFields })
      .where(eq(disputesTable.id, id))
      .returning();
    return updated;
  }

  public async markOrderRefunded(orderId: number) {
    await db
      .update(ordersTable)
      .set({ paymentStatus: "refunded", status: "cancelled", updatedAt: new Date() })
      .where(eq(ordersTable.id, orderId));
  }

  public async markOrderReleased(orderId: number) {
    await db
      .update(ordersTable)
      .set({ paymentStatus: "released", updatedAt: new Date() })
      .where(eq(ordersTable.id, orderId));
  }

  public async createTransaction(data: InferInsertModel<typeof transactionsTable>) {
    await db.insert(transactionsTable).values(data);
  }

  public async getBusinessOwnerId(businessId: number) {
    const [biz] = await db
      .select({ ownerId: businessesTable.ownerId })
      .from(businessesTable)
      .where(eq(businessesTable.id, businessId));
    return biz;
  }

  public async createNotification(userId: number, type: "message" | "order_update" | "review", title: string, body: string, relatedId: number) {
    await db.insert(notificationsTable).values({
      userId,
      type,
      title,
      body,
      relatedId,
      readAt: null,
    });
  }
}
