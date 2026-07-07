import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["user", "business_owner", "admin", "support", "rider"] })
    .notNull()
    .default("user"),
  phone: text("phone"),
  avatar: text("avatar"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationCode: text("email_verification_code"),
  emailVerificationExpiry: timestamp("email_verification_expiry", { withTimezone: true }),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
