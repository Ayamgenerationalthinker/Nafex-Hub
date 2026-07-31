import { pgTable, serial, integer, text, timestamp, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  collectionId: integer("collection_id"),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  discountPrice: numeric("discount_price", { precision: 10, scale: 2 }),
  images: text("images").array().notNull().default([]),
  stock: integer("stock"),
  approvalStatus: text("approval_status", { enum: ["pending", "approved", "rejected"] }).notNull().default("approved"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => {
  return {
    businessIdIdx: index("products_business_id_idx").on(table.businessId),
    collectionIdIdx: index("products_collection_id_idx").on(table.collectionId),
    statusIdx: index("products_status_idx").on(table.approvalStatus),
  };
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
