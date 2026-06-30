import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  businessId: integer("business_id").notNull(),
  items: jsonb("items").notNull().default([]),
  totalPrice: integer("total_price").notNull().default(0),
  status: text("status", {
    enum: ["pending", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled"],
  })
    .notNull()
    .default("pending"),
  paymentStatus: text("payment_status", {
    enum: ["unpaid", "partial", "in_escrow", "released", "refunded"],
  })
    .notNull()
    .default("unpaid"),
  paymentReference: text("payment_reference"),
  deliveryOtp: text("delivery_otp"),
  deliveryOtpExpiry: timestamp("delivery_otp_expiry", { withTimezone: true }),
  notes: text("notes"),
  coinsApplied: integer("coins_applied").notNull().default(0),
  isB2b: boolean("is_b2b").notNull().default(false),
  milestones: jsonb("milestones").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
