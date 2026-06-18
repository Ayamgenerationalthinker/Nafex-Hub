import { Router, type IRouter } from "express";
import { db, analyticsEventsTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import { z } from "zod";
import { optionalAuth, type AuthRequest } from "../lib/auth-middleware";
import { validateBody, validateQuery } from "../lib/validation";

const router: IRouter = Router();

const TrackEventBody = z.object({
  businessId: z.number().int().positive(),
  type: z.enum(["view", "message", "order"]),
});

const AnalyticsParams = z.object({
  businessId: z.coerce.number().int().positive(),
});

router.post("/analytics/track", optionalAuth, async (req: AuthRequest, res): Promise<void> => {
  // Validation middleware injected elsewhere for TrackEventBody);
    return;
  }

  await db.insert(analyticsEventsTable).values({
    businessId: parsed.data.businessId,
    userId: req.userId ?? null,
    type: parsed.data.type,
  });

  res.status(201).json({ ok: true });
});

router.get("/analytics/business/:businessId", async (req, res): Promise<void> => {
  // Validation middleware injected elsewhere for AnalyticsParams);
    return;
  }

  const { businessId } = params.data;

  // Last 30 days
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const events = await db
    .select()
    .from(analyticsEventsTable)
    .where(
      and(
        eq(analyticsEventsTable.businessId, businessId),
        gte(analyticsEventsTable.createdAt, since)
      )
    )
    .orderBy(analyticsEventsTable.createdAt);

  const totalViews = events.filter((e) => e.type === "view").length;
  const totalMessages = events.filter((e) => e.type === "message").length;
  const totalOrders = events.filter((e) => e.type === "order").length;
  const conversionRate = totalViews > 0 ? Math.round((totalOrders / totalViews) * 100 * 10) / 10 : 0;

  // Build daily stats map for last 30 days
  const dailyMap = new Map<string, { views: number; messages: number; orders: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    dailyMap.set(key, { views: 0, messages: 0, orders: 0 });
  }

  for (const event of events) {
    const key = event.createdAt.toISOString().split("T")[0];
    const day = dailyMap.get(key);
    if (day) {
      if (event.type === "view") day.views++;
      else if (event.type === "message") day.messages++;
      else if (event.type === "order") day.orders++;
    }
  }

  const dailyStats = Array.from(dailyMap.entries()).map(([date, stats]) => ({
    date,
    ...stats,
  }));

  res.json({ totalViews, totalMessages, totalOrders, conversionRate, dailyStats });
});

export default router;
