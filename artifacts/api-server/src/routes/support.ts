import { Router, type IRouter } from "express";
import { db, supportConversationsTable, supportMessagesTable, usersTable, notificationsTable, conversationsTable, messagesTable } from "@workspace/db";
import { eq, desc, asc, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { getIO } from "../lib/socket";
import { notifyAllAdmins } from "../lib/notify";

const IdParam = z.object({ id: z.coerce.number().int().positive() });

const router: IRouter = Router();

// ── Support Tickets ─────────────────────────────────────────────────────────

const CreateTicketBody = z.object({
  subject: z.string().min(1).max(255),
  category: z.enum(["Payments", "Orders", "Delivery", "Refund", "Seller Issue", "Buyer Issue", "Verification", "Technical", "general"]).default("general"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  initialMessage: z.string().min(1),
  attachmentUrl: z.string().optional(),
});

// POST /support/tickets — Create a new support ticket
router.post("/support/tickets", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  
  const parsed = CreateTicketBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }); return; }

  const [convo] = await db
    .insert(supportConversationsTable)
    .values({
      userId,
      subject: parsed.data.subject,
      category: parsed.data.category,
      priority: parsed.data.priority,
      status: "open",
    })
    .returning();

  const [caller] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));

  const [msg] = await db
    .insert(supportMessagesTable)
    .values({
      conversationId: convo.id,
      senderId: userId,
      senderRole: (caller?.role as any) ?? "user",
      text: parsed.data.initialMessage,
      attachmentUrl: parsed.data.attachmentUrl,
    })
    .returning();

  // Notify admins
  try {
    await notifyAllAdmins({
      type: "message",
      title: "New Support Ticket",
      body: parsed.data.subject,
      relatedId: convo.id,
    });
  } catch {}

  res.status(201).json({ ticket: convo, initialMessage: msg });
});

// GET /support/tickets — Admin: all; User: own
router.get("/support/tickets", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [caller] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (caller?.role === "admin") {
    const convos = await db
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
    res.json(convos);
    return;
  }

  const convos = await db
    .select()
    .from(supportConversationsTable)
    .where(eq(supportConversationsTable.userId, req.userId!))
    .orderBy(desc(supportConversationsTable.updatedAt));

  res.json(convos);
});

// GET /support/tickets/:id/messages
router.get("/support/tickets/:id/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const id = params.data.id;

  const [caller] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  const isAdmin = caller?.role === "admin";

  if (!isAdmin) {
    const [convo] = await db
      .select()
      .from(supportConversationsTable)
      .where(eq(supportConversationsTable.id, id));
    if (!convo || convo.userId !== req.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  const query = isAdmin
    ? db.select().from(supportMessagesTable).where(eq(supportMessagesTable.conversationId, id)).orderBy(asc(supportMessagesTable.createdAt))
    : db.select().from(supportMessagesTable).where(and(eq(supportMessagesTable.conversationId, id), eq(supportMessagesTable.isInternalNote, false))).orderBy(asc(supportMessagesTable.createdAt));

  const messages = await query;
  res.json(messages);
});

// POST /support/tickets/:id/messages
router.post("/support/tickets/:id/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const id = params.data.id;

  const parsed = z.object({ 
    text: z.string().min(1).max(2000),
    attachmentUrl: z.string().optional(),
    isInternalNote: z.boolean().default(false),
  }).safeParse(req.body);
  
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [caller] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  const isAdmin = caller?.role === "admin";

  const [convo] = await db
    .select()
    .from(supportConversationsTable)
    .where(eq(supportConversationsTable.id, id));

  if (!convo) { res.status(404).json({ error: "Not found" }); return; }

  if (!isAdmin && convo.userId !== req.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Only admins can post internal notes
  const isInternalNote = isAdmin ? parsed.data.isInternalNote : false;

  const [msg] = await db
    .insert(supportMessagesTable)
    .values({
      conversationId: id,
      senderId: req.userId!,
      senderRole: (caller?.role as any) ?? "user",
      text: parsed.data.text,
      attachmentUrl: parsed.data.attachmentUrl,
      isInternalNote,
    })
    .returning();

  await db
    .update(supportConversationsTable)
    .set({ updatedAt: new Date(), status: convo.status === "closed" ? "open" : convo.status }) // reopen if closed and replied to
    .where(eq(supportConversationsTable.id, id));

  try { getIO()?.to(`conv_${id}`).emit("receive_message", msg); } catch {}

  // Notifications
  if (!isInternalNote) {
    try {
      if (isAdmin) {
        await db.insert(notificationsTable).values({
          userId: convo.userId,
          type: "message",
          title: "Update on your support ticket",
          body: parsed.data.text.slice(0, 100),
          relatedId: id,
          isRead: false,
        });
      } else {
        await notifyAllAdmins({
          type: "message",
          title: "New reply on support ticket",
          body: parsed.data.text.slice(0, 100),
          relatedId: id,
        });
      }
    } catch {}
  }

  res.status(201).json(msg);
});

// PATCH /support/tickets/:id/status — Admin only
router.patch("/support/tickets/:id/status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  
  const parsed = z.object({
    status: z.enum(["open", "in_progress", "resolved", "closed"]),
    assignedAdminId: z.number().int().positive().optional().nullable()
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: "Invalid status" }); return; }

  const [caller] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (caller?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const updateData: any = { status: parsed.data.status, updatedAt: new Date() };
  if (parsed.data.assignedAdminId !== undefined) {
    updateData.assignedAdminId = parsed.data.assignedAdminId;
  }

  const [updated] = await db
    .update(supportConversationsTable)
    .set(updateData)
    .where(eq(supportConversationsTable.id, params.data.id))
    .returning();

  res.json(updated);
});

// ── Live Support Chat System ───────────────────────────────────────────────────

// POST /support/conversation — Get or create the user's support conversation
router.post("/support/conversation", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  // Find existing support conversation
  const [existing] = await db
    .select()
    .from(conversationsTable)
    .where(and(
      eq(conversationsTable.userId, userId),
      eq(conversationsTable.type, "support")
    ));

  if (existing) {
    res.json({ id: existing.id });
    return;
  }

  // Create new support conversation
  const [conv] = await db
    .insert(conversationsTable)
    .values({
      userId,
      businessId: 0,
      type: "support",
      adminStatus: "monitoring"
    })
    .returning();

  res.json({ id: conv.id });
});

// GET /support/messages — Get current user's support messages
router.get("/support/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(and(
      eq(conversationsTable.userId, userId),
      eq(conversationsTable.type, "support")
    ));

  if (!conv) {
    res.json({ conversationId: null, messages: [] });
    return;
  }

  // Fetch all messages, joining with usersTable to get role
  const messages = await db
    .select({
      id: messagesTable.id,
      senderId: messagesTable.senderId,
      text: messagesTable.text,
      createdAt: messagesTable.createdAt,
    })
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conv.id))
    .orderBy(asc(messagesTable.createdAt));

  res.json({ conversationId: conv.id, messages });
});

// GET /support/conversations — Admin: list all support chats
router.get("/support/conversations", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [caller] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (caller?.role !== "admin" && caller?.role !== "support") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Fetch all support conversations with user details
  const convos = await db
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

  // Map to include a `status` field for frontend compatibility
  const mapped = convos.map(c => ({
    ...c,
    status: c.adminStatus === "resolved" ? "closed" : "open"
  }));

  res.json(mapped);
});

// GET /support/conversations/:id/messages — Admin: get support conversation messages
router.get("/support/conversations/:id/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const id = params.data.id;

  const [caller] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (caller?.role !== "admin" && caller?.role !== "support") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const messages = await db
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
    .where(eq(messagesTable.conversationId, id))
    .orderBy(asc(messagesTable.createdAt));

  res.json(messages);
});

// POST /support/conversations/:id/messages — Admin: reply to support chat
router.post("/support/conversations/:id/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const id = params.data.id;

  const parsed = z.object({
    text: z.string().min(1).max(2000),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [caller] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (caller?.role !== "admin" && caller?.role !== "support") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, id));

  if (!conv) { res.status(404).json({ error: "Not found" }); return; }

  const [message] = await db
    .insert(messagesTable)
    .values({
      conversationId: id,
      senderId: req.userId!,
      text: parsed.data.text,
      isRead: false
    })
    .returning();

  // Reopen conversation status if closed and admin replies
  await db
    .update(conversationsTable)
    .set({
      updatedAt: new Date(),
      adminStatus: "monitoring"
    })
    .where(eq(conversationsTable.id, id));

  // Emit to socket
  try {
    getIO()?.to(`conv_${id}`).emit("receive_message", {
      ...message,
      senderRole: caller?.role ?? "admin"
    });
    getIO()?.to("admin_support").emit("support_message", {
      ...message,
      senderRole: caller?.role ?? "admin"
    });
  } catch {}

  res.status(201).json(message);
});

// PATCH /support/conversations/:id/close — Admin: close support chat
router.patch("/support/conversations/:id/close", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = IdParam.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const id = params.data.id;

  const [caller] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (caller?.role !== "admin" && caller?.role !== "support") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [updated] = await db
    .update(conversationsTable)
    .set({
      adminStatus: "resolved",
      updatedAt: new Date()
    })
    .where(eq(conversationsTable.id, id))
    .returning();

  res.json({ ok: true, conversation: updated });
});

export default router;
