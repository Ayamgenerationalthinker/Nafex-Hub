import { Router, type IRouter } from "express";
import { db, supportConversationsTable, supportMessagesTable, usersTable } from "@workspace/db";
import { eq, desc, asc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { validateBody, validateQuery } from "../lib/validation";

const IdParam = z.object({ id: z.coerce.number().int().positive() });

const router: IRouter = Router();

// POST /support/conversations — Start or return existing convo for user
router.post("/support/conversations", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const [existing] = await db
    .select()
    .from(supportConversationsTable)
    .where(eq(supportConversationsTable.userId, userId))
    .orderBy(desc(supportConversationsTable.createdAt))
    .limit(1);

  if (existing) {
    res.json(existing);
    return;
  }

  const [convo] = await db
    .insert(supportConversationsTable)
    .values({ userId })
    .returning();

  res.status(201).json(convo);
});

// GET /support/conversations — Admin: all; User: own
router.get("/support/conversations", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [caller] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (caller?.role === "admin") {
    const convos = await db
      .select({
        id: supportConversationsTable.id,
        userId: supportConversationsTable.userId,
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
    .orderBy(desc(supportConversationsTable.createdAt));

  res.json(convos);
});

// GET /support/conversations/:id/messages
router.get("/support/conversations/:id/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  // Validation middleware injected elsewhere for IdParam); return; }
  const id = params.data.id;

  const [caller] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (caller?.role !== "admin") {
    const [convo] = await db
      .select()
      .from(supportConversationsTable)
      .where(eq(supportConversationsTable.id, id));
    if (!convo || convo.userId !== req.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  const messages = await db
    .select()
    .from(supportMessagesTable)
    .where(eq(supportMessagesTable.conversationId, id))
    .orderBy(asc(supportMessagesTable.createdAt));

  res.json(messages);
});

// POST /support/conversations/:id/messages
router.post("/support/conversations/:id/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  // Validation middleware injected elsewhere for IdParam); return; }
  const id = params.data.id;

  const parsed = z.object({ text: z.string().min(1).max(2000) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Message text required" }); return; }

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

  const [msg] = await db
    .insert(supportMessagesTable)
    .values({
      conversationId: id,
      senderId: req.userId!,
      senderRole: isAdmin ? "admin" : "user",
      text: parsed.data.text,
    })
    .returning();

  await db
    .update(supportConversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(supportConversationsTable.id, id));

  res.status(201).json(msg);
});

// PATCH /support/conversations/:id/close — Admin only
router.patch("/support/conversations/:id/close", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  // Validation middleware injected elsewhere for IdParam); return; }
  const id = params.data.id;

  const [caller] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (caller?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const [updated] = await db
    .update(supportConversationsTable)
    .set({ status: "closed" })
    .where(eq(supportConversationsTable.id, id))
    .returning();

  res.json(updated);
});

export default router;
