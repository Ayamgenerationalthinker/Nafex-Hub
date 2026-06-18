import { Router, type IRouter } from "express";
import {
  db,
  businessesTable,
  ordersTable,
  messagesTable,
  conversationsTable,
  reviewsTable,
  analyticsEventsTable,
  transactionsTable,
  productsTable,
  adBoostsTable,
} from "@workspace/db";
import { eq, and, count, avg, desc, lte } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { validateBody, validateQuery } from "../lib/validation";

const router: IRouter = Router();

// ── Dashboard Stats ───────────────────────────────────────────────────────────

router.get("/dashboard/stats", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, req.userId!));

  if (!business) {
    res.json({ totalOrders: 0, pendingOrders: 0, totalMessages: 0, totalReviews: 0, averageRating: 0, profileViews: 0 });
    return;
  }

  const [orderStats]   = await db.select({ total: count() }).from(ordersTable).where(eq(ordersTable.businessId, business.id));
  const [pendingStats] = await db.select({ total: count() }).from(ordersTable).where(and(eq(ordersTable.businessId, business.id), eq(ordersTable.status, "pending")));
  const [convStats]    = await db.select({ total: count() }).from(conversationsTable).where(eq(conversationsTable.businessId, business.id));
  const [reviewStats]  = await db.select({ total: count(), avgRating: avg(reviewsTable.rating) }).from(reviewsTable).where(eq(reviewsTable.businessId, business.id));
  const [viewStats]    = await db.select({ total: count() }).from(analyticsEventsTable).where(and(eq(analyticsEventsTable.businessId, business.id), eq(analyticsEventsTable.type, "view")));

  res.json({
    businessId: business.id,
    businessName: business.name,
    businessLocation: business.location,
    totalOrders:    Number(orderStats?.total   ?? 0),
    pendingOrders:  Number(pendingStats?.total ?? 0),
    totalMessages:  Number(convStats?.total    ?? 0),
    totalReviews:   Number(reviewStats?.total  ?? 0),
    averageRating:  reviewStats?.avgRating ? Math.round(Number(reviewStats.avgRating) * 10) / 10 : 0,
    profileViews:   Number(viewStats?.total    ?? 0),
  });
});

// ── Earnings Dashboard ────────────────────────────────────────────────────────

router.get("/dashboard/earnings", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, req.userId!));

  if (!business) {
    res.json({ totalReleased: 0, inEscrow: 0, pendingRevenue: 0, totalRefunded: 0, monthlyRevenue: [], byStatus: [], recentTransactions: [] });
    return;
  }

  const orders = await db
    .select({ totalPrice: ordersTable.totalPrice, paymentStatus: ordersTable.paymentStatus, status: ordersTable.status, createdAt: ordersTable.createdAt })
    .from(ordersTable)
    .where(eq(ordersTable.businessId, business.id))
    .orderBy(desc(ordersTable.createdAt));

  let totalReleased = 0;
  let inEscrow      = 0;
  let pendingRevenue = 0;
  let totalRefunded = 0;

  for (const order of orders) {
    const amount = order.totalPrice / 100;
    if      (order.paymentStatus === "released")                                     totalReleased  += amount;
    else if (order.paymentStatus === "in_escrow")                                    inEscrow       += amount;
    else if (order.paymentStatus === "unpaid" && order.status !== "cancelled")       pendingRevenue += amount;
    else if (order.paymentStatus === "refunded")                                     totalRefunded  += amount;
  }

  // Monthly revenue — last 6 months (released orders only)
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

  const recentTransactions = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, req.userId!))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(15);

  res.json({ totalReleased, inEscrow, pendingRevenue, totalRefunded, monthlyRevenue, byStatus, recentTransactions });
});

// ── Product Performance ───────────────────────────────────────────────────────

router.get("/dashboard/product-performance", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, req.userId!));

  if (!business) { res.json([]); return; }

  const products = await db.select().from(productsTable).where(eq(productsTable.businessId, business.id));

  const orders = await db
    .select({ items: ordersTable.items, status: ordersTable.status })
    .from(ordersTable)
    .where(eq(ordersTable.businessId, business.id));

  // Lowercase name → product map for name-based matching (order items have no productId)
  const nameMap = new Map<string, typeof products[0]>(
    products.map((p) => [p.name.toLowerCase().trim(), p])
  );

  const stats = new Map<number, { unitsSold: number; revenue: number; orderCount: number }>(
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
      s.revenue   += ((item.price ?? 0) * (item.quantity ?? 1)) / 100; // pesewas → GHS
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
});

// ── Boost Status (quick check) ────────────────────────────────────────────────

router.get("/dashboard/boost-status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, req.userId!));

  if (!business) { res.json({ active: null }); return; }

  const now = new Date();

  // Expire stale boosts lazily
  const stale = await db
    .select({ id: adBoostsTable.id })
    .from(adBoostsTable)
    .where(and(eq(adBoostsTable.businessId, business.id), eq(adBoostsTable.isActive, true), lte(adBoostsTable.expiresAt, now)));

  if (stale.length > 0) {
    await db.update(adBoostsTable).set({ isActive: false, updatedAt: now })
      .where(and(eq(adBoostsTable.businessId, business.id), eq(adBoostsTable.isActive, true), lte(adBoostsTable.expiresAt, now)));
    await db.update(businessesTable).set({ isFeatured: false, featuredType: null, featuredUntil: null, updatedAt: now })
      .where(eq(businessesTable.id, business.id));
  }

  const [activeBoost] = await db
    .select()
    .from(adBoostsTable)
    .where(and(eq(adBoostsTable.businessId, business.id), eq(adBoostsTable.isActive, true)))
    .limit(1);

  res.json({ active: activeBoost ?? null, businessId: business.id });
});

// suppress unused-import warning for messagesTable (kept for future stats)
void messagesTable;

export default router;
