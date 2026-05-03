import { Router, type IRouter } from "express";
import { db, businessesTable, ordersTable, messagesTable, conversationsTable, reviewsTable, analyticsEventsTable } from "@workspace/db";
import { eq, and, count, avg } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  // Get user's business
  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, req.userId!));

  if (!business) {
    res.json({
      totalOrders: 0,
      pendingOrders: 0,
      totalMessages: 0,
      totalReviews: 0,
      averageRating: 0,
      profileViews: 0,
    });
    return;
  }

  const [orderStats] = await db
    .select({ total: count() })
    .from(ordersTable)
    .where(eq(ordersTable.businessId, business.id));

  const [pendingStats] = await db
    .select({ total: count() })
    .from(ordersTable)
    .where(and(eq(ordersTable.businessId, business.id), eq(ordersTable.status, "pending")));

  const [convStats] = await db
    .select({ total: count() })
    .from(conversationsTable)
    .where(eq(conversationsTable.businessId, business.id));

  const [reviewStats] = await db
    .select({ total: count(), avgRating: avg(reviewsTable.rating) })
    .from(reviewsTable)
    .where(eq(reviewsTable.businessId, business.id));

  const [viewStats] = await db
    .select({ total: count() })
    .from(analyticsEventsTable)
    .where(and(eq(analyticsEventsTable.businessId, business.id), eq(analyticsEventsTable.type, "view")));

  res.json({
    businessId: business.id,
    totalOrders: Number(orderStats?.total ?? 0),
    pendingOrders: Number(pendingStats?.total ?? 0),
    totalMessages: Number(convStats?.total ?? 0),
    totalReviews: Number(reviewStats?.total ?? 0),
    averageRating: reviewStats?.avgRating ? Math.round(Number(reviewStats.avgRating) * 10) / 10 : 0,
    profileViews: Number(viewStats?.total ?? 0),
  });
});

export default router;
