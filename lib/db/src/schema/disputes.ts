import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const disputesTable = pgTable("disputes", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  userId: integer("user_id").notNull(),
  reason: text("reason", {
    enum: [
      "item_not_received",
      "item_not_as_described",
      "damaged_item",
      "wrong_item",
      "seller_unresponsive",
      "other",
    ],
  }).notNull(),
  description: text("description").notNull(),
  evidenceUrls: text("evidence_urls").array().notNull().default([]),
  status: text("status", {
    enum: ["open", "under_review", "resolved_buyer", "resolved_seller", "dismissed"],
  }).notNull().default("open"),
  resolution: text("resolution"),
  adminNote: text("admin_note"),
  resolvedBy: integer("resolved_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDisputeSchema = createInsertSchema(disputesTable).omit({
  id: true,
  status: true,
  resolution: true,
  adminNote: true,
  resolvedBy: true,
  createdAt: true,
  resolvedAt: true,
  updatedAt: true,
});
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputesTable.$inferSelect;
