import { pgTable, serial, integer, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adBoostsTable = pgTable("ad_boosts", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  tier: text("tier", { enum: ["basic", "pro", "premium"] }).notNull(),
  durationDays: integer("duration_days").notNull().default(7),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("GHS"),
  paymentRef: text("payment_ref"),
  paymentStatus: text("payment_status", {
    enum: ["pending", "paid", "failed"],
  }).notNull().default("pending"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAdBoostSchema = createInsertSchema(adBoostsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAdBoost = z.infer<typeof insertAdBoostSchema>;
export type AdBoost = typeof adBoostsTable.$inferSelect;
