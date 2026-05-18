import { pgTable, serial, integer, text, numeric, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id"),
  userId: integer("user_id").notNull(),
  type: text("type", { enum: ["payment", "refund", "payout", "fee"] }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("GHS"),
  provider: text("provider", { enum: ["paystack", "momo", "manual", "system"] }).notNull(),
  providerRef: text("provider_ref"),
  channel: text("channel"),
  status: text("status", {
    enum: ["pending", "success", "failed", "reversed"],
  }).notNull().default("pending"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
