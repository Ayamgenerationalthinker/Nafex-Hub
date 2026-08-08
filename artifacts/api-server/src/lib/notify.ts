import { db, usersTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getIO } from "./socket";
import { logger } from "../shared/logger";
import { notificationsRepository } from "../features/notifications/notifications.repository";
import type { NotificationType } from "@workspace/db";

// ── notifySeller ──────────────────────────────────────────────────────────────
/**
 * Create a notification for a specific user (typically a seller) and push
 * it to all their active sessions via Socket.io.
 *
 * Design principles:
 *  - Best-effort: errors are swallowed and logged — must never block a request
 *  - Emits new_notification for the dropdown list
 *  - Emits notification_count_updated for instant badge sync across devices
 *  - Room: user_<userId> (private per-user room, joined on socket connect)
 */
export async function notifyUser(
  userId: number,
  payload: {
    type: NotificationType;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
    actorId?: number;
    relatedId?: number;
  }
): Promise<void> {
  try {
    const notif = await notificationsRepository.create({
      userId,
      actorId: payload.actorId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      metadata: payload.metadata,
      relatedId: payload.relatedId,
    });

    const io = getIO();
    if (io) {
      // Push full notification object to user's private room
      io.to(`user_${userId}`).emit("new_notification", notif);

      // Push unread count for instant badge sync across all user's active devices
      const unreadCount = await notificationsRepository.getUnreadCount(userId);
      io.to(`user_${userId}`).emit("notification_count_updated", { count: unreadCount });
    }
  } catch (err) {
    // Best-effort — never block the request that triggered the notification
    logger.warn({ err, userId, type: payload.type }, "notifyUser failed (best-effort)");
  }
}

export const notifyBuyer = notifyUser;
export const notifySeller = notifyUser;

// ── notifyAllAdmins ───────────────────────────────────────────────────────────
/**
 * Insert a notification for every admin user.
 * Preserved for backward compatibility with existing service code.
 * Errors are swallowed because notifications are best-effort.
 */
export async function notifyAllAdmins(payload: {
  type: "message" | "order_update" | "review";
  title: string;
  body: string;
  relatedId?: number | null;
}): Promise<void> {
  try {
    const admins = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.role, "admin"));
    if (admins.length === 0) return;
    const inserted = await db.insert(notificationsTable).values(
      admins.map((a) => ({
        userId: a.id,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        relatedId: payload.relatedId ?? null,
        readAt: null,
      }))
    ).returning();

    const io = getIO();
    if (io) {
      inserted.forEach((notif) => {
        io.to(`user_${notif.userId}`).emit("new_notification", notif);
      });
      io.to("admin_support").emit("new_notification", inserted[0]);
    }
  } catch (err) {
    logger.warn({ err }, "notifyAllAdmins failed (best-effort)");
  }
}
