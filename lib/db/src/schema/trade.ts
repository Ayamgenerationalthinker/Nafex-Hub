import { pgTable, serial, integer, text, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── Trade Requests ────────────────────────────────────────────────────────────
export const tradeRequestsTable = pgTable("trade_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  budget: numeric("budget", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  targetPort: text("target_port"),
  requiredByDate: text("required_by_date"),
  category: text("category"),
  status: text("status").notNull().default("pending"), // pending | sourcing | fulfilled | cancelled
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ── Trade Quotes ──────────────────────────────────────────────────────────────
export const tradeQuotesTable = pgTable("trade_quotes", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  supplierId: integer("supplier_id").notNull(),
  supplierName: text("supplier_name").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  moq: integer("moq").notNull(),
  shippingCost: numeric("shipping_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  productionTime: text("production_time").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("pending"), // pending | accepted | rejected
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Trade Orders ──────────────────────────────────────────────────────────────
// Created when a buyer accepts a quote
export const tradeOrdersTable = pgTable("trade_orders", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  quoteId: integer("quote_id").notNull(),
  buyerId: integer("buyer_id").notNull(),
  supplierId: integer("supplier_id").notNull(),
  // Full lifecycle: pending → sourcing → quoted → production → shipped → customs → delivered
  status: text("status").notNull().default("pending"),
  // Escrow lifecycle: pending → funded → released | refunded
  escrowStatus: text("escrow_status").notNull().default("pending"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  productName: text("product_name").notNull(),
  supplierName: text("supplier_name").notNull(),
  notes: text("notes"),
  buyerConfirmedDelivery: boolean("buyer_confirmed_delivery").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// ── Trade Escrow ──────────────────────────────────────────────────────────────
export const tradeEscrowTable = pgTable("trade_escrow", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().unique(),
  buyerId: integer("buyer_id").notNull(),
  supplierId: integer("supplier_id").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("GHS"),
  paystackRef: text("paystack_ref").unique(),
  paystackStatus: text("paystack_status").notNull().default("pending"), // pending | success | failed
  fundedAt: timestamp("funded_at", { withTimezone: true }),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Trade Tracking Events ─────────────────────────────────────────────────────
export const tradeTrackingEventsTable = pgTable("trade_tracking_events", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  status: text("status").notNull(), // mirrors trade order status
  description: text("description").notNull(),
  location: text("location"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────
export const insertTradeRequestSchema = createInsertSchema(tradeRequestsTable).omit({
  id: true, createdAt: true, updatedAt: true, status: true,
});
export const insertTradeQuoteSchema = createInsertSchema(tradeQuotesTable).omit({
  id: true, createdAt: true, status: true, acceptedAt: true,
});
export const insertTradeOrderSchema = createInsertSchema(tradeOrdersTable).omit({
  id: true, createdAt: true, updatedAt: true, status: true, escrowStatus: true, buyerConfirmedDelivery: true,
});

// ── Types ─────────────────────────────────────────────────────────────────────
export type TradeRequest       = typeof tradeRequestsTable.$inferSelect;
export type TradeQuote         = typeof tradeQuotesTable.$inferSelect;
export type TradeOrder         = typeof tradeOrdersTable.$inferSelect;
export type TradeEscrow        = typeof tradeEscrowTable.$inferSelect;
export type TradeTrackingEvent = typeof tradeTrackingEventsTable.$inferSelect;

export type InsertTradeRequest = z.infer<typeof insertTradeRequestSchema>;
export type InsertTradeQuote   = z.infer<typeof insertTradeQuoteSchema>;
export type InsertTradeOrder   = z.infer<typeof insertTradeOrderSchema>;

// ── Trade status helpers ──────────────────────────────────────────────────────
export const TRADE_ORDER_STATUSES = [
  "pending",
  "sourcing",
  "quoted",
  "production",
  "shipped",
  "customs",
  "delivered",
] as const;

export type TradeOrderStatus = typeof TRADE_ORDER_STATUSES[number];
