import { Router, type IRouter } from "express";
import { db, tradeMessagesTable, tradeOrdersTable, usersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { getIO } from "../lib/socket";
import { validateBody, validateQuery } from "../lib/validation";

const router: IRouter = Router();

const IdParams = z.object({ id: z.coerce.number().int().positive() });
const SendBody = z.object({ text: z.string().min(1).max(2000) });

type ParticipantResult =
  | { error: string; status: 401 | 403 | 404; order?: undefined }
  | { error?: undefined; status?: undefined; order: typeof tradeOrdersTable.$inferSelect };

async function assertOrderParticipant(
  orderId: number,
  userId: number | undefined,
  role: string | undefined
): Promise<ParticipantResult> {
  if (userId === undefined) return { error: "Not authorized", status: 401 };
  const [order] = await db
    .select()
    .from(tradeOrdersTable)
    .where(eq(tradeOrdersTable.id, orderId));
  if (!order) return { error: "Order not found", status: 404 };
  const allowed = role === "admin" || order.buyerId === userId || order.supplierId === userId;
  if (!allowed) return { error: "Not authorized", status: 403 };
  return { order };
}

// ── List messages for an order ───────────────────────────────────────────────
router.get(
  "/trade/orders/:id/messages",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    // Validation middleware injected elsewhere for IdParams); return; }

    const check = await assertOrderParticipant(params.data.id, req.userId, req.userRole);
    if (check.error !== undefined) { res.status(check.status).json({ error: check.error }); return; }

    const rows = await db
      .select({
        id: tradeMessagesTable.id,
        orderId: tradeMessagesTable.orderId,
        senderId: tradeMessagesTable.senderId,
        text: tradeMessagesTable.text,
        createdAt: tradeMessagesTable.createdAt,
        senderName: usersTable.name,
      })
      .from(tradeMessagesTable)
      .leftJoin(usersTable, eq(tradeMessagesTable.senderId, usersTable.id))
      .where(eq(tradeMessagesTable.orderId, params.data.id))
      .orderBy(asc(tradeMessagesTable.createdAt));

    res.json(rows);
  }
);

// ── Send a message ───────────────────────────────────────────────────────────
router.post(
  "/trade/orders/:id/messages",
  requireAuth,
  async (req: AuthRequest, res): Promise<void> => {
    // Validation middleware injected elsewhere for IdParams); return; }

    // Validation middleware injected elsewhere for SendBody); return; }

    const check = await assertOrderParticipant(params.data.id, req.userId, req.userRole);
    if (check.error !== undefined) { res.status(check.status).json({ error: check.error }); return; }

    const [msg] = await db
      .insert(tradeMessagesTable)
      .values({
        orderId: params.data.id,
        senderId: req.userId!,
        text: body.data.text,
      })
      .returning();

    const [sender] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!));

    const payload = { ...msg, senderName: sender?.name ?? null };

    const io = getIO();
    if (io) io.to(`trade_${params.data.id}`).emit("trade_message", payload);

    res.status(201).json(payload);
  }
);

export default router;
