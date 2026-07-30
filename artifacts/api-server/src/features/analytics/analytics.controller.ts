import { type Request, type Response } from "express";
import { type AuthRequest } from "../../lib/auth-middleware";
import { z } from "zod";
import * as repo from "./analytics.repository";

const TrackEventBody = z.object({
  businessId: z.number().int().positive(),
  type: z.enum(["view", "message", "order"]),
});

const AnalyticsParams = z.object({
  businessId: z.coerce.number().int().positive(),
});

export async function trackEvent(req: AuthRequest, res: Response): Promise<void> {
  const parsed = TrackEventBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  await repo.trackEvent(parsed.data.businessId, req.userId ?? null, parsed.data.type);
  res.status(201).json({ ok: true });
}

export async function getBusinessAnalytics(req: Request, res: Response): Promise<void> {
  const params = AnalyticsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const events = await repo.getBusinessAnalytics(params.data.businessId);

  const totalViews    = events.filter((e) => e.type === "view").length;
  const totalMessages = events.filter((e) => e.type === "message").length;
  const totalOrders   = events.filter((e) => e.type === "order").length;
  const conversionRate = totalViews > 0 ? Math.round((totalOrders / totalViews) * 100 * 10) / 10 : 0;

  // Build daily stats map for last 30 days
  const dailyMap = new Map<string, { views: number; messages: number; orders: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dailyMap.set(d.toISOString().split("T")[0]!, { views: 0, messages: 0, orders: 0 });
  }

  for (const event of events) {
    const key = event.createdAt.toISOString().split("T")[0]!;
    const day = dailyMap.get(key);
    if (day) {
      if (event.type === "view") day.views++;
      else if (event.type === "message") day.messages++;
      else if (event.type === "order") day.orders++;
    }
  }

  const dailyStats = Array.from(dailyMap.entries()).map(([date, stats]) => ({ date, ...stats }));

  res.json({ totalViews, totalMessages, totalOrders, conversionRate, dailyStats });
}
