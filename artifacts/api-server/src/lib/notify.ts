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

import { inArray } from "drizzle-orm";

// ── Admin Notification Categories & Role Permissions ─────────────────────────
export type AdminCategory = "marketplace" | "moderation" | "verification" | "security" | "system";

const ADMIN_CATEGORY_MAP: Record<string, AdminCategory> = {
  // Marketplace
  admin_new_seller: "marketplace",
  admin_new_buyer: "marketplace",
  admin_new_order: "marketplace",
  admin_payment_failed: "marketplace",
  admin_payment_successful: "marketplace",
  admin_refund_requested: "marketplace",
  admin_refund_completed: "marketplace",
  // Moderation
  admin_product_pending: "moderation",
  admin_product_reported: "moderation",
  admin_user_reported: "moderation",
  admin_review_reported: "moderation",
  admin_message_reported: "moderation",
  // Verification
  admin_kyc_submitted: "verification",
  admin_verification_pending: "verification",
  // Security
  admin_failed_logins: "security",
  admin_suspicious_activity: "security",
  admin_account_locked: "security",
  admin_permission_violation: "security",
  // System
  admin_server_error: "system",
  admin_queue_failure: "system",
  admin_backup_failure: "system",
  admin_deployment_completed: "system",
  admin_high_cpu: "system",
};

const CATEGORY_ROLE_PERMISSIONS: Record<AdminCategory, string[]> = {
  marketplace: ["super_admin", "admin", "support"],
  moderation: ["super_admin", "admin", "moderator", "support"],
  verification: ["super_admin", "admin", "moderator"],
  security: ["super_admin", "admin"],
  system: ["super_admin"],
};

export function getAdminNotificationCategory(type: string): AdminCategory {
  return ADMIN_CATEGORY_MAP[type] ?? "system";
}

/**
 * Dispatch a permission-aware notification to all eligible administrators.
 * Filters recipient admins based on their role permissions.
 * Performs a bulk database insertion in a single query.
 */
export async function notifyAdmins(payload: {
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  actorId?: number;
  relatedId?: number;
}): Promise<void> {
  try {
    const category = getAdminNotificationCategory(payload.type as string);
    const allowedRoles = CATEGORY_ROLE_PERMISSIONS[category] ?? ["super_admin", "admin"];

    // Find all admins whose role matches category permissions
    const eligibleAdmins = await db
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(inArray(usersTable.role, allowedRoles as any));

    if (eligibleAdmins.length === 0) return;

    // Bulk insert notifications for all eligible admins in one query
    const insertedList = await db
      .insert(notificationsTable)
      .values(
        eligibleAdmins.map((a) => ({
          userId: a.id,
          actorId: payload.actorId,
          type: payload.type,
          title: payload.title,
          body: payload.body,
          metadata: payload.metadata,
          relatedId: payload.relatedId,
          readAt: null,
        }))
      )
      .returning();

    const io = getIO();
    if (io) {
      for (const notif of insertedList) {
        io.to(`user_${notif.userId}`).emit("new_notification", notif);
        const unreadCount = await notificationsRepository.getUnreadCount(notif.userId);
        io.to(`user_${notif.userId}`).emit("notification_count_updated", { count: unreadCount });
      }

      // Broadcast to role-specific socket rooms for instant multi-admin sync
      allowedRoles.forEach((role) => {
        io.to(`admin_role_${role}`).emit("new_admin_notification", {
          type: payload.type,
          category,
          title: payload.title,
          body: payload.body,
          metadata: payload.metadata,
        });
      });
      io.to("admin_room").emit("new_admin_notification", {
        type: payload.type,
        category,
        title: payload.title,
        body: payload.body,
        metadata: payload.metadata,
      });
    }
  } catch (err) {
    logger.warn({ err, type: payload.type }, "notifyAdmins failed (best-effort)");
  }
}

// Legacy backward compatibility alias
export async function notifyAllAdmins(payload: {
  type: "message" | "order_update" | "review";
  title: string;
  body: string;
  relatedId?: number | null;
}): Promise<void> {
  const typeMap: Record<string, NotificationType> = {
    message: "admin_message_reported",
    order_update: "admin_new_order",
    review: "admin_review_reported",
  };
  return notifyAdmins({
    type: typeMap[payload.type] ?? "admin_new_order",
    title: payload.title,
    body: payload.body,
    relatedId: payload.relatedId ?? undefined,
  });
}
