import { pgTable, serial, integer, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Exhaustive seller notification type enum.
 * Legacy admin types (message, order_update, review) are preserved for
 * backward compatibility with existing notification rows and code paths.
 */
export const NOTIFICATION_TYPES = [
  // Orders
  "new_order", "order_cancelled", "delivery_confirmed", "payment_released",
  "refund_requested", "refund_approved", "refund_rejected",
  // Messages
  "new_message",
  // Products
  "product_approved", "product_rejected", "low_stock",
  // Payments
  "payment_received", "withdrawal_completed", "withdrawal_failed",
  // Reviews
  "new_review",
  // System / KYC
  "kyc_approved", "kyc_rejected", "announcement",
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
