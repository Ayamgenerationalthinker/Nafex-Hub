import { db, ordersTable, transactionsTable, businessesTable, notificationsTable } from "@workspace/db";
import { eq, desc, and, inArray, InferInsertModel } from "drizzle-orm";

type NewTransaction = InferInsertModel<typeof transactionsTable>;

export class PaymentsRepository {
  public async getOrderById(orderId: number) {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    return order;
  }

  public async getBusinessById(businessId: number) {
    const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, businessId));
    return biz;
  }

  public async getBusinessByOwnerId(ownerId: number) {
    const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.ownerId, ownerId));
    return biz;
  }

  public async createTransaction(data: NewTransaction) {
    const [tx] = await db.insert(transactionsTable).values(data).returning();
    return tx;
  }

  public async updateTransactionStatus(orderId: number, providerRef: string, status: string) {
    await db
      .update(transactionsTable)
      .set({ status: status as any, updatedAt: new Date() })
      .where(and(
        eq(transactionsTable.orderId, orderId),
        eq(transactionsTable.providerRef, providerRef)
      ));
  }

  public async getPendingTransaction(orderId: number, providerRef: string) {
    const [tx] = await db
      .select()
      .from(transactionsTable)
      .where(and(eq(transactionsTable.orderId, orderId), eq(transactionsTable.providerRef, providerRef)));
    return tx;
  }

  public async updateOrderPaymentStatus(orderId: number, data: { paymentStatus: "partial" | "unpaid" | "in_escrow" | "released" | "refunded"; paymentReference?: string; milestones?: any }) {
    const [updatedOrder] = await db
      .update(ordersTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ordersTable.id, orderId))
      .returning();
    return updatedOrder;
  }

  public async updateOrderForWebhook(orderId: number, reference: string) {
    await db
      .update(ordersTable)
      .set({ paymentStatus: "in_escrow", paymentReference: reference, updatedAt: new Date() })
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.paymentStatus, "unpaid")));
  }

  public async getUserTransactions(userId: number) {
    return await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, userId))
      .orderBy(desc(transactionsTable.createdAt));
  }

  public async getAllTransactions(limit: number = 500) {
    return await db
      .select()
      .from(transactionsTable)
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit);
  }

  public async atomicReleaseEscrow(orderId: number) {
    const [updated] = await db
      .update(ordersTable)
      .set({ paymentStatus: "released", updatedAt: new Date() })
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.paymentStatus, "in_escrow")))
      .returning();
    return updated;
  }

  public async atomicRefundOrder(orderId: number) {
    const [updated] = await db
      .update(ordersTable)
      .set({ paymentStatus: "refunded", status: "cancelled", updatedAt: new Date() })
      .where(and(
        eq(ordersTable.id, orderId),
        inArray(ordersTable.paymentStatus, ["in_escrow", "released"])
      ))
      .returning();
    return updated;
  }

  public async createNotification(userId: number, type: "message" | "order_update" | "review", title: string, body: string, relatedId: number) {
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
