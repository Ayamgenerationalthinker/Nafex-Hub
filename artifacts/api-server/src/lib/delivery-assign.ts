import {
  db,
  deliveriesTable,
  deliveryEventsTable,
  ridersTable,
} from "@workspace/db";
import { and, eq, desc, sql } from "drizzle-orm";

/** Pick the best available rider for a zone (zone match first, then highest rating). */
export async function findAvailableRider(zone?: string | null) {
  const base = and(eq(ridersTable.isAvailable, true), eq(ridersTable.isActive, true));

  if (zone?.trim()) {
    const z = zone.trim().toLowerCase();
    const [zoneRider] = await db
      .select()
      .from(ridersTable)
      .where(and(base, sql`lower(${ridersTable.zone}) = ${z}`))
      .orderBy(desc(ridersTable.rating))
      .limit(1);
    if (zoneRider) return zoneRider;
  }

  const [anyRider] = await db
    .select()
    .from(ridersTable)
    .where(base)
    .orderBy(desc(ridersTable.rating))
    .limit(1);

  return anyRider ?? null;
}

/** Assign rider to delivery; returns updated delivery row or null if no rider. */
export async function autoAssignRider(
  delivery: typeof deliveriesTable.$inferSelect,
): Promise<typeof deliveriesTable.$inferSelect | null> {
  if (delivery.riderId || delivery.status !== "created") return delivery;

  const rider = await findAvailableRider(delivery.deliveryZone);
  if (!rider) return null;

  const [updated] = await db
    .update(deliveriesTable)
    .set({ riderId: rider.id, status: "assigned", updatedAt: new Date() })
    .where(eq(deliveriesTable.id, delivery.id))
    .returning();

  await db.insert(deliveryEventsTable).values({
    deliveryId: delivery.id,
    status: "assigned",
    note: `Auto-assigned to ${rider.name} (${rider.phone})`,
  });

  await db
    .update(ridersTable)
    .set({ isAvailable: false, updatedAt: new Date() })
    .where(eq(ridersTable.id, rider.id));

  return updated ?? null;
}
