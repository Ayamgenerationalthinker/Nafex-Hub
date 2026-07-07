import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  senderId: integer("sender_id").notNull(),
  text: text("text").notNull(),
  attachmentUrl: text("attachment_url"),
  attachmentType: text("attachment_type"), // 'image', 'pdf', 'voice', 'product', 'order'
  referenceId: integer("reference_id"), // e.g. productId or orderId
  isRead: boolean("is_read").notNull().default(false),
  delivered: boolean("delivered").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
