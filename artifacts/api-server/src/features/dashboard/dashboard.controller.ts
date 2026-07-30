import { type Response } from "express";
import { type AuthRequest } from "../../lib/auth-middleware";
import * as repo from "./dashboard.repository";

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getStats(req: AuthRequest, res: Response): Promise<void> {
  const business = await repo.getBusinessByOwner(req.userId!);
  if (!business) {
    res.json({ totalOrders: 0, pendingOrders: 0, totalMessages: 0, totalReviews: 0, averageRating: 0, profileViews: 0 });
    return;
  }

  const { orderStats, pendingStats, convStats, reviewStats, viewStats } = await repo.getDashboardStats(business.id);

  res.json({
    businessId:    business.id,
    totalOrders:   Number(orderStats?.total   ?? 0),
    pendingOrders: Number(pendingStats?.total ?? 0),
    totalMessages: Number(convStats?.total    ?? 0),
    totalReviews:  Number(reviewStats?.total  ?? 0),
    averageRating: reviewStats?.avgRating ? Math.round(Number(reviewStats.avgRating) * 10) / 10 : 0,
    profileViews:  Number(viewStats?.total    ?? 0),
  });
}

// ── Earnings ──────────────────────────────────────────────────────────────────

export async function getEarnings(req: AuthRequest, res: Response): Promise<void> {
  const business = await repo.getBusinessByOwner(req.userId!);
  if (!business) {
    res.json({ totalReleased: 0, inEscrow: 0, pendingRevenue: 0, totalRefunded: 0, monthlyRevenue: [], byStatus: [], recentTransactions: [] });
    return;
  }

  const orders = await repo.getOrdersByBusiness(business.id);
  let totalReleased = 0, inEscrow = 0, pendingRevenue = 0, totalRefunded = 0;

  for (const order of orders) {
    const amount = order.totalPrice / 100;
    if      (order.paymentStatus === "released")                                   totalReleased  += amount;
    else if (order.paymentStatus === "in_escrow")                                  inEscrow       += amount;
    else if (order.paymentStatus === "unpaid" && order.status !== "cancelled")     pendingRevenue += amount;
    else if (order.paymentStatus === "refunded")                                   totalRefunded  += amount;
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyMap = new Map<string, { revenue: number; orders: number; month: string }>();
  for (const order of orders) {
    const d = new Date(order.createdAt);
    if (d < sixMonthsAgo || order.paymentStatus !== "released") continue;
    const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const month   = d.toLocaleDateString("en-GH", { month: "short", year: "2-digit" });
    const existing = monthlyMap.get(sortKey) ?? { revenue: 0, orders: 0, month };
    monthlyMap.set(sortKey, { ...existing, revenue: existing.revenue + order.totalPrice / 100, orders: existing.orders + 1 });
  }

  const monthlyRevenue = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({ month: v.month, revenue: Math.round(v.revenue * 100) / 100, orders: v.orders }));

  const byStatus = [
    { status: "Released",  amount: Math.round(totalReleased  * 100) / 100, color: "#22c55e" },
    { status: "In Escrow", amount: Math.round(inEscrow       * 100) / 100, color: "#f59e0b" },
    { status: "Pending",   amount: Math.round(pendingRevenue * 100) / 100, color: "#6366f1" },
    { status: "Refunded",  amount: Math.round(totalRefunded  * 100) / 100, color: "#ef4444" },
  ];

  const recentTransactions = await repo.getRecentTransactions(req.userId!);

  res.json({ totalReleased, inEscrow, pendingRevenue, totalRefunded, monthlyRevenue, byStatus, recentTransactions });
}

// ── Product Performance ───────────────────────────────────────────────────────

export async function getProductPerformance(req: AuthRequest, res: Response): Promise<void> {
  const business = await repo.getBusinessByOwner(req.userId!);
  if (!business) { res.json([]); return; }

  const products = await repo.getProductsByBusiness(business.id);
  const orders   = await repo.getOrderItemsByBusiness(business.id);

  const nameMap = new Map<string, typeof products[0]>(products.map((p) => [p.name.toLowerCase().trim(), p]));
  const stats   = new Map<number, { unitsSold: number; revenue: number; orderCount: number }>(
    products.map((p) => [p.id, { unitsSold: 0, revenue: 0, orderCount: 0 }])
  );

  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const items = (order.items as Array<{ name?: string; quantity?: number; price?: number }>) ?? [];
    if (!Array.isArray(items)) continue;
    const seen = new Set<number>();
    for (const item of items) {
      const product = nameMap.get(item.name?.toLowerCase().trim() ?? "");
      if (!product) continue;
      const s = stats.get(product.id)!;
      s.unitsSold += item.quantity ?? 1;
      s.revenue   += ((item.price ?? 0) * (item.quantity ?? 1)) / 100;
      if (!seen.has(product.id)) { s.orderCount += 1; seen.add(product.id); }
    }
  }

  const result = products
    .map((p) => ({
      id:            p.id,
      name:          p.name,
      price:         Number(p.price),
      discountPrice: p.discountPrice ? Number(p.discountPrice) : null,
      images:        p.images,
      stock:         p.stock,
      ...(stats.get(p.id) ?? { unitsSold: 0, revenue: 0, orderCount: 0 }),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  res.json(result);
}

// ── Boost Status ──────────────────────────────────────────────────────────────

export async function getBoostStatus(req: AuthRequest, res: Response): Promise<void> {
  const business = await repo.getBusinessByOwner(req.userId!);
  if (!business) { res.json({ active: null }); return; }

  const stale = await repo.getStaleBoosts(business.id);
  if (stale.length > 0) await repo.expireStaleBoosts(business.id);

  const activeBoost = await repo.getActiveBoost(business.id);
  res.json({ active: activeBoost, businessId: business.id });
}
