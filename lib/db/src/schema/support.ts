import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const supportStatusEnum = pgEnum("support_status", ["open", "closed"]);
export const supportSenderRoleEnum = pgEnum("support_sender_role", ["user", "admin"]);

export const supportConversationsTable = pgTable("support_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  status: supportStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supportMessagesTable = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  senderId: integer("sender_id").notNull(),
  senderRole: supportSenderRoleEnum("sender_role").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SupportConversation = typeof supportConversationsTable.$inferSelect;
export type SupportMessage = typeof supportMessagesTable.$inferSelect;
