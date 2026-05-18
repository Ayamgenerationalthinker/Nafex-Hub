import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tradeRequestsTable = pgTable("trade_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  budget: numeric("budget", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"), // pending | fulfilled | cancelled
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const tradeQuotesTable = pgTable("trade_quotes", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  supplierId: integer("supplier_id").notNull(), // userId of the quoting seller
  supplierName: text("supplier_name").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  moq: integer("moq").notNull(), // minimum order quantity
  shippingCost: numeric("shipping_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  productionTime: text("production_time").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTradeRequestSchema = createInsertSchema(tradeRequestsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});
export const insertTradeQuoteSchema = createInsertSchema(tradeQuotesTable).omit({
  id: true,
  createdAt: true,
});

export type TradeRequest = typeof tradeRequestsTable.$inferSelect;
export type TradeQuote = typeof tradeQuotesTable.$inferSelect;
export type InsertTradeRequest = z.infer<typeof insertTradeRequestSchema>;
export type InsertTradeQuote = z.infer<typeof insertTradeQuoteSchema>;
