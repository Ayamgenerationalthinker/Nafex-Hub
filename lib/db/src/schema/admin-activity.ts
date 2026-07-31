import { pgTable, serial, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const adminActivityTable = pgTable("admin_activity", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  adminName: text("admin_name").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    createdAtIdx: index("admin_activity_created_idx").on(table.createdAt),
  };
});

export type AdminActivity = typeof adminActivityTable.$inferSelect;
