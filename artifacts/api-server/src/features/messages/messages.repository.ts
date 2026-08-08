import { db, conversationsTable, messagesTable, businessesTable, notificationsTable, usersTable } from "@workspace/db";
import { eq, and, desc, ne, count, inArray, sql, InferInsertModel } from "drizzle-orm";

type NewMessage = InferInsertModel<typeof messagesTable>;
type NewConversation = InferInsertModel<typeof conversationsTable>;

export class MessagesRepository {
  public async getUnreadCount(conversationId: number, forUserId: number): Promise<number> {
    const [result] = await db
      .select({ val: count() })
      .from(messagesTable)
      .where(and(
        eq(messagesTable.conversationId, conversationId),
        ne(messagesTable.senderId, forUserId),
        eq(messagesTable.isRead, false)
      ));
    return Number(result?.val ?? 0);
  }

  public async getBuyerConversations(userId: number) {
    return await db
      .select({
        id: conversationsTable.id,
        userId: conversationsTable.userId,
        businessId: conversationsTable.businessId,
        type: conversationsTable.type,
        flagged: conversationsTable.flagged,
        adminStatus: conversationsTable.adminStatus,
        createdAt: conversationsTable.createdAt,
        updatedAt: conversationsTable.updatedAt,
        businessName: businessesTable.name,
        businessLogo: businessesTable.logo,
      })
      .from(conversationsTable)
      .leftJoin(businessesTable, eq(conversationsTable.businessId, businessesTable.id))
      .where(and(eq(conversationsTable.userId, userId), eq(conversationsTable.type, "buyer_seller")))
      .orderBy(desc(conversationsTable.updatedAt));
  }

  public async getBusinessByOwner(ownerId: number) {
    const [business] = await db
      .select({ id: businessesTable.id, name: businessesTable.name })
      .from(businessesTable)
      .where(eq(businessesTable.ownerId, ownerId));
    return business;
  }

  public async getSellerConversations(businessId: number) {
    return await db
      .select({
        id: conversationsTable.id,
        userId: conversationsTable.userId,
        businessId: conversationsTable.businessId,
        type: conversationsTable.type,
        flagged: conversationsTable.flagged,
        adminStatus: conversationsTable.adminStatus,
        createdAt: conversationsTable.createdAt,
        updatedAt: conversationsTable.updatedAt,
        customerName: usersTable.name,
      })
      .from(conversationsTable)
      .leftJoin(usersTable, eq(conversationsTable.userId, usersTable.id))
      .where(and(eq(conversationsTable.businessId, businessId), eq(conversationsTable.type, "buyer_seller")))
      .orderBy(desc(conversationsTable.updatedAt));
  }

  public async getAdminConversations() {
    return await db
      .select({
        id: conversationsTable.id,
        userId: conversationsTable.userId,
        businessId: conversationsTable.businessId,
        type: conversationsTable.type,
        flagged: conversationsTable.flagged,
        adminStatus: conversationsTable.adminStatus,
        createdAt: conversationsTable.createdAt,
        updatedAt: conversationsTable.updatedAt,
        businessName: businessesTable.name,
        businessLogo: businessesTable.logo,
      })
      .from(conversationsTable)
      .leftJoin(businessesTable, eq(conversationsTable.businessId, businessesTable.id))
      .where(eq(conversationsTable.type, "buyer_seller"))
      .orderBy(desc(conversationsTable.updatedAt));
  }

  public async getLastMessagesForConversations(convIds: number[]) {
    if (convIds.length === 0) return [];
    return await db
      .select()
      .from(messagesTable)
      .where(
        inArray(
          messagesTable.id,
          db
            .select({ id: sql<number>`max(${messagesTable.id})` })
            .from(messagesTable)
            .where(inArray(messagesTable.conversationId, convIds))
            .groupBy(messagesTable.conversationId)
        )
      );
  }

  public async getUnreadCountsForConversations(convIds: number[], userId: number) {
    if (convIds.length === 0) return [];
    return await db
      .select({
        conversationId: messagesTable.conversationId,
        count: count(),
      })
      .from(messagesTable)
      .where(and(
        inArray(messagesTable.conversationId, convIds),
        ne(messagesTable.senderId, userId),
        eq(messagesTable.isRead, false)
      ))
      .groupBy(messagesTable.conversationId);
  }

  public async getConversation(userId: number, businessId: number, type: string) {
    const [existing] = await db
      .select()
      .from(conversationsTable)
      .where(and(
        eq(conversationsTable.userId, userId),
        eq(conversationsTable.businessId, businessId),
        eq(conversationsTable.type, type),
      ));
    return existing;
  }

  public async getBusinessById(id: number) {
    const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, id));
    return business;
  }

  public async getLastMessage(conversationId: number) {
    const [last] = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, conversationId)).orderBy(desc(messagesTable.createdAt)).limit(1);
    return last;
  }

  public async createConversation(data: NewConversation) {
    const [conv] = await db.insert(conversationsTable).values(data).returning();
    return conv;
  }

  public async getConversationById(id: number) {
    const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id));
    return conv;
  }

  public async getBusinessOwnerId(businessId: number) {
    const [biz] = await db.select({ ownerId: businessesTable.ownerId }).from(businessesTable).where(eq(businessesTable.id, businessId));
    return biz;
  }

  public async markMessagesAsRead(conversationId: number, userId: number) {
    await db
      .update(messagesTable)
      .set({ isRead: true })
      .where(and(
        eq(messagesTable.conversationId, conversationId),
        ne(messagesTable.senderId, userId)
      ));
  }

  public async getMessages(conversationId: number) {
    return await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(messagesTable.createdAt);
  }

  public async createMessage(data: NewMessage) {
    const [message] = await db.insert(messagesTable).values(data).returning();
    return message;
  }

  public async updateConversation(id: number, data: Partial<NewConversation>) {
    const [updated] = await db.update(conversationsTable).set({ ...data, updatedAt: new Date() }).where(eq(conversationsTable.id, id)).returning();
    return updated;
  }

  public async getUserRole(userId: number) {
    const [user] = await db.select({ role: usersTable.role, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));
    return user;
  }

  public async createNotification(userId: number, type: "message" | "order_update" | "review", title: string, body: string, relatedId: number) {
    const [notif] = await db.insert(notificationsTable).values({
      userId,
      type,
      title,
      body,
      relatedId,
      readAt: null,
    }).returning();
    return notif;
  }

  public async getAdmins() {
    return await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "admin"));
  }
}
