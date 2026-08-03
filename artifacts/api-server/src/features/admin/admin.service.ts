import { logAdminAction } from "../../lib/log-admin-action";
import * as repo from "./admin.repository";

// ── Activity ──────────────────────────────────────────────────────────────────

export async function getActivity(limit: number) {
  return repo.getAdminActivity(limit);
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function listUsers(search?: string) {
  const rows = await repo.getAllUsers();
  if (search) {
    const q = search.toLowerCase();
    return rows.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }
  return rows;
}

export async function changeUserRole(
  adminId: number,
  adminName: string,
  targetId: number,
  role: "user" | "business_owner" | "admin"
) {
  const [target] = await repo.getUserById(targetId);
  const [updated] = await repo.updateUserRole(targetId, role);
  if (!updated) return null;

  await logAdminAction({
    adminId,
    adminName,
    action: role === "admin" ? "grant_admin" : "revoke_admin",
    targetType: "user",
    targetId: String(targetId),
    details: { targetName: target?.name ?? updated.name, previousRole: target?.role ?? "user", newRole: role },
  });

  return updated;
}

export async function removeUser(adminId: number, adminName: string, targetId: number) {
  const outcome = await repo.deleteUserCascade(targetId);

  if (outcome.ok) {
    await logAdminAction({
      adminId,
      adminName,
      action: "delete_user",
      targetType: "user",
      targetId: String(targetId),
      details: { targetName: outcome.target.name, targetEmail: outcome.target.email, targetRole: outcome.target.role },
    }).catch(() => undefined);
  }

  return outcome;
}

// ── Product moderation ────────────────────────────────────────────────────────

export async function getPendingProducts() {
  return repo.getPendingProducts();
}

export async function approveProduct(adminId: number, adminName: string, productId: number) {
  await repo.approveProduct(productId);
  await logAdminAction({ adminId, adminName, action: "product_approved", targetType: "product", targetId: String(productId) });
}

export async function rejectProduct(adminId: number, adminName: string, productId: number, reason: string) {
  await repo.rejectProduct(productId, reason);
  await logAdminAction({ adminId, adminName, action: "product_rejected", targetType: "product", targetId: String(productId), details: { reason } });
}

// ── KYC ───────────────────────────────────────────────────────────────────────

export async function updateKyc(
  adminId: number,
  adminName: string,
  businessId: number,
  data: { verificationTier: "bronze" | "silver" | "gold"; kycNotes?: string; isVerified?: boolean }
) {
  const update: Record<string, unknown> = {
    verificationTier: data.verificationTier,
    kycNotes: data.kycNotes ?? null,
  };
  if (data.isVerified !== undefined) update.isVerified = data.isVerified;
  else if (data.verificationTier === "gold") update.isVerified = true;

  await repo.updateBusinessKyc(businessId, update);
  await logAdminAction({ adminId, adminName, action: "kyc_tier_updated", targetType: "business", targetId: String(businessId), details: { tier: data.verificationTier } });
}

// ── Financial summary ─────────────────────────────────────────────────────────

export async function getFinancialSummary() {
  const rows = await repo.getAllTransactions();
  const summary = { gmv: 0, netRevenue: 0, refunded: 0, payoutsReleased: 0, pendingEscrow: 0, failedTxns: 0, totalTxns: rows.length };
  for (const t of rows) {
    const amount = Number(t.amount);
    if (t.type === "payment" && t.status === "success") summary.gmv += amount;
    if (t.type === "refund" && t.status === "success") summary.refunded += amount;
    if (t.type === "payout" && t.status === "success") summary.payoutsReleased += amount;
    if (t.type === "payment" && t.status === "pending") summary.pendingEscrow += amount;
    if (t.status === "failed") summary.failedTxns += 1;
  }
  summary.netRevenue = summary.gmv * 0.05;
  return summary;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getAdminStats() {
  const [[users], [totalBiz], [verifiedBiz], [orders], [convs]] = await repo.getAdminStats();
  return {
    totalUsers: users?.count ?? 0,
    totalBusinesses: totalBiz?.count ?? 0,
    verifiedBusinesses: verifiedBiz?.count ?? 0,
    totalOrders: orders?.count ?? 0,
    totalMessages: convs?.count ?? 0,
  };
}

export async function getPublicStats() {
  const { total, verified, categories, featured } = await repo.getPublicStats();
  return {
    totalBusinesses: total?.count ?? 0,
    verifiedBusinesses: verified?.count ?? 0,
    totalCategories: categories.length,
    featuredBrands: featured?.count ?? 0,
  };
}

export async function getCategories() {
  return repo.getCategories();
}

export async function getAdminBusinesses(query: { search?: string; category?: string; verified?: string }) {
  return repo.getAdminBusinesses(query);
}

export async function getFeaturedAnalytics() {
  const { featuredBizRows, events } = await repo.getFeaturedAnalytics();
  if (!featuredBizRows.length) return { summary: [], businesses: [] };

  const statsMap = new Map<number, { views: number; messages: number; orders: number }>();
  for (const biz of featuredBizRows) statsMap.set(biz.id, { views: 0, messages: 0, orders: 0 });
  for (const ev of events) {
    const s = statsMap.get(ev.businessId);
    if (!s) continue;
    if (ev.type === "view") s.views++;
    else if (ev.type === "message") s.messages++;
    else if (ev.type === "order") s.orders++;
  }

  const businesses = featuredBizRows.map((biz) => ({
    ...biz,
    featuredUntil: biz.featuredUntil ? biz.featuredUntil.toISOString() : null,
    ...(statsMap.get(biz.id) ?? { views: 0, messages: 0, orders: 0 }),
  }));

  const now = new Date();
  const activeTypes = ["homepage_top", "homepage_section", "search_boost"] as const;
  const summary = activeTypes.map((type) => ({
    type,
    count: featuredBizRows.filter((b) => b.featuredType === type && (!b.featuredUntil || b.featuredUntil > now)).length,
  }));

  return { summary, businesses };
}

export async function getAdminSkus() {
  return repo.getAdminSkus();
}

