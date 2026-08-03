import { pgTable, serial, integer, text, timestamp, numeric, index, check, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { businessesTable } from "./businesses";
import { collectionsTable } from "./collections";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  collectionId: integer("collection_id").references(() => collectionsTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("General"),
  brand: text("brand"),
  model: text("model"),
  skuPrefix: text("sku_prefix").notNull().default("NFH-GEN-GEN-GEN"),
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
    stockCheck: check("stock_non_negative", sql`${table.stock} >= 0`),
    priceCheck: check("price_non_negative", sql`${table.price} >= 0`),
  };
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;

export const productVariantsTable = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  sku: text("sku").notNull().unique(),
  attributes: jsonb("attributes").notNull().default({}), // e.g. { size: "42", color: "Black" }
  stock: integer("stock").notNull().default(0),
  price: numeric("price", { precision: 10, scale: 2 }), // optional variant-specific price override
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => {
  return {
    productIdIdx: index("variants_product_id_idx").on(table.productId),
    skuIdx: index("variants_sku_idx").on(table.sku),
    stockCheck: check("variant_stock_non_negative", sql`${table.stock} >= 0`),
  };
});

export const insertProductVariantSchema = createInsertSchema(productVariantsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;
export type ProductVariant = typeof productVariantsTable.$inferSelect;
