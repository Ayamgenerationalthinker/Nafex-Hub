import { NotificationsRepository } from "./notifications.repository";
import { ForbiddenError, NotFoundError } from "../../shared/errors/AppError";
import { getIO } from "../../lib/socket";
import { logger } from "../../shared/logger";

export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  // ── Read ─────────────────────────────────────────────────────────────────────

  async getNotifications(userId: number, query: { page?: number; limit?: number; unreadOnly?: boolean }) {
    return this.repo.listForUser(userId, query);
  }

  async getUnreadCount(userId: number) {
    const count = await this.repo.getUnreadCount(userId);
    return { count };
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  /**
   * Mark a single notification as read.
   * After the DB write, emits two socket events to the user's private room:
   *   • notification_read         — so other tabs can remove the unread dot
   *   • notification_count_updated — so all tabs instantly update the badge
   */
  async markRead(notificationId: number, userId: number) {
    // Ownership check via the UPDATE's WHERE clause — returns null if not owned
    const updated = await this.repo.markRead(notificationId, userId);

    if (updated === null) {
      // Could be: not found, wrong owner, or already read — distinguish for better DX
      const notif = await this.repo.findById(notificationId);
      if (!notif) throw new NotFoundError("Notification not found");
      if (notif.userId !== userId) throw new ForbiddenError("Not your notification");
      // Already read — return current unread count without error (idempotent)
    }

    const newCount = await this.repo.getUnreadCount(userId);
    this._emitBadgeSync(userId, notificationId, newCount);
    return { ok: true, unreadCount: newCount };
  }

  /**
   * Bulk-mark all unread notifications as read.
   * Emits notifications_all_read so every device resets its badge to zero.
   */
  async markAllRead(userId: number) {
    const updatedCount = await this.repo.markAllRead(userId);
    this._emitAllRead(userId);
    return { ok: true, updated: updatedCount };
  }

  /**
   * Delete a single notification (user can manage their own list).
   * Emits notification_deleted for real-time list update on other devices.
   */
  async deleteNotification(notificationId: number, userId: number) {
    const deleted = await this.repo.deleteOne(notificationId, userId);
    if (!deleted) {
      const notif = await this.repo.findById(notificationId);
      if (!notif) throw new NotFoundError("Notification not found");
      if (notif.userId !== userId) throw new ForbiddenError("Not your notification");
    }

    const newCount = await this.repo.getUnreadCount(userId);
    try {
      getIO()
        ?.to(`user_${userId}`)
        .emit("notification_deleted", { notificationId, unreadCount: newCount });
    } catch (err) {
      logger.warn({ err }, "notification_deleted emit failed");
    }
    return { ok: true };
  }

  // ── Private socket helpers ───────────────────────────────────────────────────

  private _emitBadgeSync(userId: number, notificationId: number, unreadCount: number) {
    try {
      getIO()?.to(`user_${userId}`).emit("notification_read", { notificationId, unreadCount });
      getIO()?.to(`user_${userId}`).emit("notification_count_updated", { count: unreadCount });
    } catch (err) {
      logger.warn({ err }, "notification_read emit failed");
    }
  }

  private _emitAllRead(userId: number) {
    try {
      getIO()?.to(`user_${userId}`).emit("notifications_all_read", { unreadCount: 0 });
      getIO()?.to(`user_${userId}`).emit("notification_count_updated", { count: 0 });
    } catch (err) {
      logger.warn({ err }, "notifications_all_read emit failed");
    }
  }
}

export const notificationsService = new NotificationsService(new NotificationsRepository());
