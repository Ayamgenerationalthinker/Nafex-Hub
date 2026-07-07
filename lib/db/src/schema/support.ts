import { pgTable, serial, integer, text, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";

export const supportStatusEnum = pgEnum("support_status", ["open", "in_progress", "resolved", "closed"]);
export const supportSenderRoleEnum = pgEnum("support_sender_role", ["user", "admin", "business_owner", "rider"]);

export const supportConversationsTable = pgTable("support_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subject: text("subject").notNull().default("Support Request"),
  category: text("category").notNull().default("general"), // Payments, Orders, Delivery, Refund, etc.
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  assignedAdminId: integer("assigned_admin_id"),
  status: supportStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const supportMessagesTable = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  senderId: integer("sender_id").notNull(),
  senderRole: supportSenderRoleEnum("sender_role").notNull(),
  text: text("text").notNull(),
  attachmentUrl: text("attachment_url"),
  isInternalNote: boolean("is_internal_note").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SupportConversation = typeof supportConversationsTable.$inferSelect;
export type SupportMessage = typeof supportMessagesTable.$inferSelect;
