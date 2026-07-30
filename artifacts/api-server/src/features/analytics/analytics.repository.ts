import { db, analyticsEventsTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";

export async function trackEvent(businessId: number, userId: number | null, type: "view" | "message" | "order") {
  return db.insert(analyticsEventsTable).values({ businessId, userId, type });
}

export async function getBusinessAnalytics(businessId: number) {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  return db
    .select()
    .from(analyticsEventsTable)
    .where(and(eq(analyticsEventsTable.businessId, businessId), gte(analyticsEventsTable.createdAt, since)))
    .orderBy(analyticsEventsTable.createdAt);
}
