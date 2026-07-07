import { Router, type IRouter } from "express";
import { db, conversationsTable, messagesTable, businessesTable, notificationsTable } from "@workspace/db";
import { eq, and, desc, ne, count } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { getIO } from "../lib/socket";
import { notifyAllAdmins } from "../lib/notify";

const router: IRouter = Router();

const CreateConversationBody = z.object({
  businessId: z.number().int().positive(),
});

const ConversationParams = z.object({
  id: z.coerce.number().int().positive(),
});

const SendMessageBody = z.object({
  text: z.string().min(1).max(2000),
  attachmentUrl: z.string().optional(),
  attachmentType: z.enum(['image', 'pdf', 'voice', 'product', 'order']).optional(),
  referenceId: z.number().int().positive().optional(),
});

function emitToRoom(conversationId: number, message: unknown) {
  try { getIO()?.to(`conv_${conversationId}`).emit("receive_message", message); } catch {}
}

async function getUnreadCount(conversationId: number, forUserId: number): Promise<number> {
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

// ── Buyer conversations ──────────────────────────────────────────────────────
router.get("/conversations", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conversations = await db
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
    .where(and(eq(conversationsTable.userId, req.userId!), eq(conversationsTable.type, "buyer_seller")))
    .orderBy(desc(conversationsTable.updatedAt));

  const withLastMsg = await Promise.all(
    conversations.map(async (conv) => {
      const [last] = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conv.id))
        .orderBy(desc(messagesTable.createdAt))
        .limit(1);
      const unreadCount = await getUnreadCount(conv.id, req.userId!);
      return { ...conv, lastMessage: last?.text ?? null, unreadCount };
    })
  );

  res.json(withLastMsg);
});

// ── Seller conversations (business owner inbox) ───────────────────────────────
router.get("/seller/conversations", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [business] = await db
    .select({ id: businessesTable.id, name: businessesTable.name })
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, req.userId!));

  if (!business) { res.json([]); return; }

  const conversations = await db
    .select({
      id: conversationsTable.id,
      userId: conversationsTable.userId,
      businessId: conversationsTable.businessId,
      type: conversationsTable.type,
      flagged: conversationsTable.flagged,
      adminStatus: conversationsTable.adminStatus,
      createdAt: conversationsTable.createdAt,
      updatedAt: conversationsTable.updatedAt,
    })
    .from(conversationsTable)
    .where(and(eq(conversationsTable.businessId, business.id), eq(conversationsTable.type, "buyer_seller")))
    .orderBy(desc(conversationsTable.updatedAt));

  const withDetails = await Promise.all(
    conversations.map(async (conv) => {
      const [last] = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conv.id))
        .orderBy(desc(messagesTable.createdAt))
        .limit(1);
      const unreadCount = await getUnreadCount(conv.id, req.userId!);
      return { ...conv, businessName: business.name, businessLogo: null as string | null, lastMessage: last?.text ?? null, unreadCount };
    })
  );

  res.json(withDetails);
});

// ── Admin conversations (moderation) ──────────────────────────────────────────
router.get("/admin/conversations", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Access denied" }); return; }

  const conversations = await db
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

  const withDetails = await Promise.all(
    conversations.map(async (conv) => {
      const [last] = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conv.id))
        .orderBy(desc(messagesTable.createdAt))
        .limit(1);
      return { ...conv, lastMessage: last?.text ?? null };
    })
  );

  res.json(withDetails);
});


// ── Start or get a buyer-seller conversation ─────────────────────────────────
router.post("/conversations", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db
    .select()
    .from(conversationsTable)
    .where(and(
      eq(conversationsTable.userId, req.userId!),
      eq(conversationsTable.businessId, parsed.data.businessId),
      eq(conversationsTable.type, "buyer_seller"),
    ));

  if (existing) {
    const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, existing.businessId));
    const [last] = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, existing.id)).orderBy(desc(messagesTable.createdAt)).limit(1);
    const unreadCount = await getUnreadCount(existing.id, req.userId!);
    res.json({ ...existing, businessName: business?.name ?? null, businessLogo: business?.logo ?? null, lastMessage: last?.text ?? null, unreadCount });
    return;
  }

  const [conv] = await db
    .insert(conversationsTable)
    .values({ userId: req.userId!, businessId: parsed.data.businessId, type: "buyer_seller" })
    .returning();

  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, parsed.data.businessId));

  res.json({ ...conv, businessName: business?.name ?? null, businessLogo: business?.logo ?? null, lastMessage: null, unreadCount: 0 });
});

// ── Mark messages as read ─────────────────────────────────────────────────────
router.patch("/conversations/:id/read", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ConversationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, params.data.id));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  const [biz] = conv.businessId && conv.businessId > 0
    ? await db.select({ ownerId: businessesTable.ownerId }).from(businessesTable).where(eq(businessesTable.id, conv.businessId))
    : [null];

  const isParticipant = conv.userId === req.userId || biz?.ownerId === req.userId || req.userRole === "admin";
  if (!isParticipant) { res.status(403).json({ error: "Access denied" }); return; }

  await db
    .update(messagesTable)
    .set({ isRead: true })
    .where(and(
      eq(messagesTable.conversationId, params.data.id),
      ne(messagesTable.senderId, req.userId!)
    ));

  res.json({ ok: true });
});

// ── Get messages ─────────────────────────────────────────────────────────────
router.get("/conversations/:id/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ConversationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, params.data.id));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  const [biz] = conv.businessId
    ? await db.select({ ownerId: businessesTable.ownerId }).from(businessesTable).where(eq(businessesTable.id, conv.businessId))
    : [null];

  const isParticipant = conv.userId === req.userId || biz?.ownerId === req.userId || req.userRole === "admin";
  if (!isParticipant) { res.status(403).json({ error: "Access denied" }); return; }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(messagesTable.createdAt);

  res.json(messages);
});

// ── Send a message ────────────────────────────────────────────────────────────
router.post("/conversations/:id/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ConversationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, params.data.id));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  const [biz] = conv.businessId
    ? await db.select({ ownerId: businessesTable.ownerId }).from(businessesTable).where(eq(businessesTable.id, conv.businessId))
    : [null];

  const isParticipant = conv.userId === req.userId || biz?.ownerId === req.userId || req.userRole === "admin";
  if (!isParticipant) { res.status(403).json({ error: "Not a participant" }); return; }

  // Keyword flagging logic
  const flaggedKeywords = ["refund", "scam", "fraud", "fake", "stolen"];
  const isFlagged = flaggedKeywords.some(kw => parsed.data.text.toLowerCase().includes(kw));

  // Save FIRST, emit second — no fake frontend-only messages
  const [message] = await db
    .insert(messagesTable)
    .values({ 
      conversationId: params.data.id, 
      senderId: req.userId!, 
      text: parsed.data.text,
      attachmentUrl: parsed.data.attachmentUrl,
      attachmentType: parsed.data.attachmentType,
      referenceId: parsed.data.referenceId,
      isRead: false 
    })
    .returning();

  let updateConv: any = { updatedAt: new Date() };
  if (isFlagged && !conv.flagged) {
    updateConv.flagged = true;
    updateConv.adminStatus = "monitoring"; // alert admin
  }

  await db.update(conversationsTable).set(updateConv).where(eq(conversationsTable.id, params.data.id));

  emitToRoom(params.data.id, message);

  // Notify other party
  try {
    let notifyUserId: number | null = null;
    if (conv.userId === req.userId) {
      notifyUserId = biz?.ownerId ?? null;
    } else if (biz?.ownerId === req.userId) {
      notifyUserId = conv.userId;
    }

    if (notifyUserId) {
      await db.insert(notificationsTable).values({
        userId: notifyUserId,
        type: "message",
        title: "New message",
        body: parsed.data.text.slice(0, 100),
        relatedId: params.data.id,
        isRead: false,
      });
    }

    if (isFlagged && !conv.flagged) {
      await notifyAllAdmins({
        type: "message",
        title: "Conversation Flagged",
        body: `Conversation #${conv.id} was flagged for suspicious keywords.`,
        relatedId: params.data.id,
      });
    }
  } catch {}

  res.status(201).json(message);
});

// ── Admin: Intervene or Resolve ─────────────────────────────────────────────
router.patch("/conversations/:id/admin-status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
  
  const params = ConversationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = z.object({ status: z.enum(["monitoring", "intervened", "resolved"]) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid status" }); return; }

  const [updated] = await db
    .update(conversationsTable)
    .set({ adminStatus: parsed.data.status, updatedAt: new Date() })
    .where(eq(conversationsTable.id, params.data.id))
    .returning();

  res.json(updated);
});

export default router;
