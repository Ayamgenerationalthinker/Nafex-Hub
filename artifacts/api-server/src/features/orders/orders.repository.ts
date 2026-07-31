import { db, ordersTable, businessesTable, notificationsTable, usersTable } from "@workspace/db";
import { eq, desc, sql, and, gt } from "drizzle-orm";
import { InferInsertModel } from "drizzle-orm";

type NewOrder = InferInsertModel<typeof ordersTable>;

export class OrdersRepository {
  public async getOrderById(id: number) {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    return order;
  }

  public async getRecentIdenticalOrder(userId: number, businessId: number, totalPrice: number, timeframeSeconds: number) {
    const timeThreshold = new Date(Date.now() - timeframeSeconds * 1000);
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.userId, userId),
          eq(ordersTable.businessId, businessId),
          eq(ordersTable.totalPrice, totalPrice),
          gt(ordersTable.createdAt, timeThreshold)
        )
      )
      .limit(1);
    return order;
  }

  public async getBusiness(businessId: number) {
    const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, businessId));
    return business;
  }

  public async getUser(userId: number) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    return user;
  }

  public async deductUserCoins(userId: number, amount: number) {
    await db.update(usersTable)
      .set({ loyaltyPoints: sql`${usersTable.loyaltyPoints} - ${amount}` })
      .where(eq(usersTable.id, userId));
  }

  public async addUserCoins(userId: number, amount: number) {
    await db.update(usersTable)
      .set({ loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${amount}` })
      .where(eq(usersTable.id, userId));
  }

  public async createOrder(data: NewOrder) {
    const [order] = await db.insert(ordersTable).values(data).returning();
    return order;
  }

  public async updateOrder(id: number, data: Partial<NewOrder>) {
    const [order] = await db.update(ordersTable).set(data).where(eq(ordersTable.id, id)).returning();
    return order;
  }

  public async getOrdersByUser(userId: number) {
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.userId, userId))
      .orderBy(desc(ordersTable.createdAt));
    return this.attachBusinessDetails(orders);
  }

  public async getOrdersByBusinessOwner(ownerId: number) {
    const businesses = await db
      .select({ id: businessesTable.id })
      .from(businessesTable)
      .where(eq(businessesTable.ownerId, ownerId));

    if (businesses.length === 0) return [];

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
    return this.attachBusinessDetails(allOrders);
  }

  public async getAllOrders(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(ordersTable);

    const orders = await db
      .select()
      .from(ordersTable)
      .orderBy(desc(ordersTable.createdAt))
      .limit(limit)
      .offset(offset);

    const withDetails = await this.attachBusinessDetails(orders);
    
    return {
      orders: withDetails,
      total: count,
      page,
      pages: Math.max(1, Math.ceil(count / limit)),
    };
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

  public async getAdmins() {
    return await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "admin"));
  }

  private async attachBusinessDetails(orders: typeof ordersTable.$inferSelect[]) {
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
}
