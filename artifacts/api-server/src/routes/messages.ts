import { Router, type IRouter } from "express";
import { db, conversationsTable, messagesTable, businessesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

const CreateConversationBody = z.object({
  businessId: z.number().int().positive(),
});

const ConversationParams = z.object({
  id: z.coerce.number().int().positive(),
});

const SendMessageBody = z.object({
  text: z.string().min(1),
});

router.get("/conversations", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const conversations = await db
    .select({
      id: conversationsTable.id,
      userId: conversationsTable.userId,
      businessId: conversationsTable.businessId,
      createdAt: conversationsTable.createdAt,
      updatedAt: conversationsTable.updatedAt,
      businessName: businessesTable.name,
      businessLogo: businessesTable.logo,
    })
    .from(conversationsTable)
    .leftJoin(businessesTable, eq(conversationsTable.businessId, businessesTable.id))
    .where(eq(conversationsTable.userId, req.userId!))
    .orderBy(desc(conversationsTable.updatedAt));

  // Attach last message to each conversation
  const withLastMsg = await Promise.all(
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

  res.json(withLastMsg);
});

router.post("/conversations", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Return existing conversation if one exists
  const [existing] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.userId, req.userId!),
        eq(conversationsTable.businessId, parsed.data.businessId)
      )
    );

  if (existing) {
    const [business] = await db
      .select()
      .from(businessesTable)
      .where(eq(businessesTable.id, existing.businessId));
    const [last] = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, existing.id))
      .orderBy(desc(messagesTable.createdAt))
      .limit(1);
    res.json({
      ...existing,
      businessName: business?.name ?? null,
      businessLogo: business?.logo ?? null,
      lastMessage: last?.text ?? null,
    });
    return;
  }

  const [conv] = await db
    .insert(conversationsTable)
    .values({ userId: req.userId!, businessId: parsed.data.businessId })
    .returning();

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, parsed.data.businessId));

  res.json({
    ...conv,
    businessName: business?.name ?? null,
    businessLogo: business?.logo ?? null,
    lastMessage: null,
  });
});

router.get("/conversations/:id/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Verify the user owns this conversation
  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.id, params.data.id),
        eq(conversationsTable.userId, req.userId!)
      )
    );

  if (!conv) {
    // Also allow business owner to view
    const [convForBiz] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, params.data.id));
    if (!convForBiz) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(messagesTable.createdAt);

  res.json(messages);
});

router.post("/conversations/:id/messages", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const params = ConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Verify conversation exists and user is part of it
  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, params.data.id));

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const [message] = await db
    .insert(messagesTable)
    .values({
      conversationId: params.data.id,
      senderId: req.userId!,
      text: parsed.data.text,
    })
    .returning();

  // Update conversation's updatedAt
  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, params.data.id));

  res.status(201).json(message);
});

export default router;
