import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deliveriesTable = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().unique(),
  riderId: integer("rider_id"),
  trackingCode: text("tracking_code").notNull().unique(),
  status: text("status", {
    enum: ["created", "assigned", "picked_up", "in_transit", "delivered", "failed", "returned"],
  }).notNull().default("created"),
  pickupAddress: text("pickup_address").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryZone: text("delivery_zone"),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  estimatedArrival: timestamp("estimated_arrival", { withTimezone: true }),
  notes: text("notes"),
  proofImageUrl: text("proof_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const deliveryEventsTable = pgTable("delivery_events", {
  id: serial("id").primaryKey(),
  deliveryId: integer("delivery_id").notNull(),
  status: text("status", {
    enum: ["created", "assigned", "picked_up", "in_transit", "delivered", "failed", "returned"],
  }).notNull(),
  note: text("note"),
  location: text("location"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDeliverySchema = createInsertSchema(deliveriesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type Delivery = typeof deliveriesTable.$inferSelect;
export type DeliveryEvent = typeof deliveryEventsTable.$inferSelect;
