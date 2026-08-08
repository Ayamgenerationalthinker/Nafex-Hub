import { pgTable, serial, integer, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Exhaustive seller notification type enum.
 * Legacy admin types (message, order_update, review) are preserved for
 * backward compatibility with existing notification rows and code paths.
 */
export const NOTIFICATION_TYPES = [
  // Buyer Orders
  "order_accepted", "order_shipped", "order_delivered", "order_cancelled", "refund_processed",
  // Buyer Messages
  "seller_reply",
  // Buyer Payments
  "payment_successful", "payment_failed", "refund_completed",
  // Buyer Wishlist
  "back_in_stock", "price_drop",
  // Buyer Reviews
  "review_response",
  // Buyer System / Account
  "account_update",

  // Seller Orders
  "new_order", "delivery_confirmed", "payment_released", "refund_requested", "refund_approved", "refund_rejected",
  // Seller/General Messages
  "new_message",
  // Seller Products
  "product_approved", "product_rejected", "low_stock",
  // Seller Payments
  "payment_received", "withdrawal_completed", "withdrawal_failed",
  // Seller Reviews
  "new_review",
  // System / KYC
  "kyc_approved", "kyc_rejected", "announcement",
  // Admin Marketplace
  "admin_new_seller", "admin_new_buyer", "admin_new_order", "admin_payment_failed", "admin_payment_successful", "admin_refund_requested", "admin_refund_completed",
  // Admin Moderation
  "admin_product_pending", "admin_product_reported", "admin_user_reported", "admin_review_reported", "admin_message_reported",
  // Admin Verification
  "admin_kyc_submitted", "admin_verification_pending",
  // Admin Security
  "admin_failed_logins", "admin_suspicious_activity", "admin_account_locked", "admin_permission_violation",
  // Admin System
  "admin_server_error", "admin_queue_failure", "admin_backup_failure", "admin_deployment_completed", "admin_high_cpu",

  // Legacy (admin notifications — backward compat)
  "message", "order_update", "review",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const notificationsTable = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    /** Recipient */
    userId: integer("user_id").notNull(),
    /** Who triggered the event (buyer, admin, system) */
    actorId: integer("actor_id"),
    type: text("type", { enum: NOTIFICATION_TYPES }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** Arbitrary event metadata — orderId, productId, businessId, etc. */
    metadata: jsonb("metadata"),
    /**
     * NULL = unread. Timestamp of first read (immutable once set).
     * Using a timestamp instead of boolean enables precise multi-device sync.
     */
    readAt: timestamp("read_at", { withTimezone: true }),
    /** Kept for backward compat with existing DB rows */
    relatedId: integer("related_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    /**
     * Composite index for two hot access patterns:
     *  1. Unread count:   WHERE user_id=$1 AND read_at IS NULL
     *  2. Paginated list: WHERE user_id=$1 ORDER BY created_at DESC
     */
    userUnreadIdx: index("idx_notifications_user_unread").on(
      table.userId,
      table.readAt,
      table.createdAt
    ),
  })
);

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
