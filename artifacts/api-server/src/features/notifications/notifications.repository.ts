import { db, notificationsTable } from "@workspace/db";
import { eq, and, isNull, isNotNull, desc, count, sql } from "drizzle-orm";
import type { NotificationType } from "@workspace/db";

export interface CreateNotificationPayload {
  userId: number;
  actorId?: number;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  relatedId?: number;
}

export class NotificationsRepository {
  /**
   * Insert a new notification row and return the full row.
   * Used by notifySeller() — the caller is responsible for emitting the
   * socket event after the DB write succeeds.
   */
  async create(payload: CreateNotificationPayload) {
    const [row] = await db
      .insert(notificationsTable)
      .values({
        userId: payload.userId,
        actorId: payload.actorId ?? null,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        metadata: payload.metadata ?? null,
        relatedId: payload.relatedId ?? null,
        readAt: null,
      })
      .returning();
    return row;
  }

  /**
   * Paginated list for a user.
   * Default: all notifications, ordered by newest first.
   * Avoids N+1 — single query.
   */
  async listForUser(
    userId: number,
    { page = 1, limit = 20, unreadOnly = false }: { page?: number; limit?: number; unreadOnly?: boolean } = {}
  ) {
    const offset = (page - 1) * limit;
    const conditions = unreadOnly
      ? and(eq(notificationsTable.userId, userId), isNull(notificationsTable.readAt))
      : eq(notificationsTable.userId, userId);

    const [rows, [countRow]] = await Promise.all([
      db
        .select()
        .from(notificationsTable)
        .where(conditions)
        .orderBy(desc(notificationsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(notificationsTable)
        .where(conditions),
    ]);

    return {
      notifications: rows,
      total: Number(countRow?.total ?? 0),
      page,
      limit,
    };
  }

  /**
   * Efficient unread count — uses the composite index.
   */
  async getUnreadCount(userId: number): Promise<number> {
    const [row] = await db
      .select({ val: count() })
      .from(notificationsTable)
      .where(and(eq(notificationsTable.userId, userId), isNull(notificationsTable.readAt)));
    return Number(row?.val ?? 0);
  }

  /**
   * Mark a single notification as read.
   * Returns null if not found or not owned by userId (authorization check).
   */
  async markRead(notificationId: number, userId: number) {
    const [row] = await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notificationsTable.id, notificationId),
          eq(notificationsTable.userId, userId),
          isNull(notificationsTable.readAt)   // idempotent: skip if already read
        )
      )
      .returning();
    return row ?? null;
  }

  /**
   * Bulk mark all unread notifications as read for a user.
   * Returns the number of rows updated.
   */
  async markAllRead(userId: number): Promise<number> {
    const result = await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notificationsTable.userId, userId),
          isNull(notificationsTable.readAt)
        )
      )
      .returning({ id: notificationsTable.id });
    return result.length;
  }

  /**
   * Delete a single notification with ownership validation.
   */
  async deleteOne(notificationId: number, userId: number) {
    const [deleted] = await db
      .delete(notificationsTable)
      .where(
        and(
          eq(notificationsTable.id, notificationId),
          eq(notificationsTable.userId, userId)
        )
      )
      .returning({ id: notificationsTable.id });
    return deleted ?? null;
  }

  /**
   * Fetch a single notification row (for ownership checks before mutations).
   */
  async findById(notificationId: number) {
    const [row] = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, notificationId));
    return row ?? null;
  }
}

// Singleton — re-used by the service and by notify.ts
export const notificationsRepository = new NotificationsRepository();
