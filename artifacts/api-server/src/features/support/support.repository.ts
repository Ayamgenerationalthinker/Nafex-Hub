import { db, supportConversationsTable, supportMessagesTable, usersTable, conversationsTable, messagesTable } from "@workspace/db";
import { eq, desc, asc, and, InferInsertModel } from "drizzle-orm";

type NewSupportConversation = InferInsertModel<typeof supportConversationsTable>;
type NewSupportMessage = InferInsertModel<typeof supportMessagesTable>;

export class SupportRepository {
  public async getUserRole(userId: number) {
    const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
    return user;
  }

  public async createSupportConversation(data: NewSupportConversation) {
    const [convo] = await db.insert(supportConversationsTable).values(data).returning();
    return convo;
  }

  public async createSupportMessage(data: NewSupportMessage) {
    const [msg] = await db.insert(supportMessagesTable).values(data).returning();
    return msg;
  }

  public async getAllSupportTickets() {
    return await db
      .select({
        id: supportConversationsTable.id,
        userId: supportConversationsTable.userId,
        subject: supportConversationsTable.subject,
        category: supportConversationsTable.category,
        priority: supportConversationsTable.priority,
        assignedAdminId: supportConversationsTable.assignedAdminId,
        status: supportConversationsTable.status,
        createdAt: supportConversationsTable.createdAt,
        updatedAt: supportConversationsTable.updatedAt,
        userName: usersTable.name,
        userEmail: usersTable.email,
        userRole: usersTable.role,
      })
      .from(supportConversationsTable)
      .leftJoin(usersTable, eq(supportConversationsTable.userId, usersTable.id))
      .orderBy(desc(supportConversationsTable.updatedAt));
  }

  public async getUserSupportTickets(userId: number) {
    return await db
      .select()
      .from(supportConversationsTable)
      .where(eq(supportConversationsTable.userId, userId))
      .orderBy(desc(supportConversationsTable.updatedAt));
  }

  public async getSupportTicket(id: number) {
    const [convo] = await db
      .select()
      .from(supportConversationsTable)
      .where(eq(supportConversationsTable.id, id));
    return convo;
  }

  public async getSupportMessages(conversationId: number, includeInternal: boolean) {
    const query = includeInternal
      ? db.select().from(supportMessagesTable).where(eq(supportMessagesTable.conversationId, conversationId)).orderBy(asc(supportMessagesTable.createdAt))
      : db.select().from(supportMessagesTable).where(and(eq(supportMessagesTable.conversationId, conversationId), eq(supportMessagesTable.isInternalNote, false))).orderBy(asc(supportMessagesTable.createdAt));
    return await query;
  }

  public async updateSupportConversationStatus(id: number, status: any, updateFields: any = {}) {
    const [updated] = await db
      .update(supportConversationsTable)
      .set({ status, updatedAt: new Date(), ...updateFields })
      .where(eq(supportConversationsTable.id, id))
      .returning();
    return updated;
  }

  // Live support methods
  public async getLiveSupportConversation(userId: number) {
    const [existing] = await db
      .select()
      .from(conversationsTable)
      .where(and(
        eq(conversationsTable.userId, userId),
        eq(conversationsTable.type, "support")
      ));
    return existing;
  }

  public async createLiveSupportConversation(userId: number) {
    const [conv] = await db
      .insert(conversationsTable)
      .values({
        userId,
        businessId: 0,
        type: "support",
        adminStatus: "monitoring"
      })
      .returning();
    return conv;
  }

  public async getLiveSupportConversationById(id: number) {
    const [conv] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, id));
    return conv;
  }

  public async getLiveSupportMessages(conversationId: number) {
    return await db
      .select({
        id: messagesTable.id,
        senderId: messagesTable.senderId,
        text: messagesTable.text,
        createdAt: messagesTable.createdAt,
      })
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(asc(messagesTable.createdAt));
  }

  public async getAllLiveSupportConversations() {
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
        userName: usersTable.name,
        userEmail: usersTable.email,
        userRole: usersTable.role,
      })
      .from(conversationsTable)
      .leftJoin(usersTable, eq(conversationsTable.userId, usersTable.id))
      .where(eq(conversationsTable.type, "support"))
      .orderBy(desc(conversationsTable.updatedAt));
  }

  public async getLiveSupportMessagesWithRoles(conversationId: number) {
    return await db
      .select({
        id: messagesTable.id,
        conversationId: messagesTable.conversationId,
        senderId: messagesTable.senderId,
        text: messagesTable.text,
        createdAt: messagesTable.createdAt,
        senderRole: usersTable.role,
      })
      .from(messagesTable)
      .leftJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(asc(messagesTable.createdAt));
  }

  public async createLiveSupportMessage(data: InferInsertModel<typeof messagesTable>) {
    const [msg] = await db.insert(messagesTable).values(data).returning();
    return msg;
  }

  public async updateLiveSupportConversation(id: number, data: any) {
    const [updated] = await db
      .update(conversationsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(conversationsTable.id, id))
      .returning();
    return updated;
  }
}
