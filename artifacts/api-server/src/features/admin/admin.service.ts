import { logAdminAction } from "../../lib/log-admin-action";
import * as repo from "./admin.repository";
import { notifySeller } from "../../lib/notify";

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
  const product = await repo.approveProduct(productId);
  await logAdminAction({ adminId, adminName, action: "product_approved", targetType: "product", targetId: String(productId) });
  // Notify the seller whose product was approved
  if (product?.ownerId) {
    notifySeller(product.ownerId, {
      type: "product_approved",
      title: "Your product has been approved",
      body: `"${product.name}" is now live on Nafex Hub and visible to buyers.`,
      metadata: { productId },
      relatedId: productId,
    });
  }
}

export async function rejectProduct(adminId: number, adminName: string, productId: number, reason: string) {
  const product = await repo.rejectProduct(productId, reason);
  await logAdminAction({ adminId, adminName, action: "product_rejected", targetType: "product", targetId: String(productId), details: { reason } });
  // Notify the seller whose product was rejected
  if (product?.ownerId) {
    notifySeller(product.ownerId, {
      type: "product_rejected",
      title: "Your product requires changes",
      body: `"${product.name}" was not approved. Reason: ${reason}`,
      metadata: { productId, reason },
      relatedId: productId,
    });
  }
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

  const updated = await repo.updateBusinessKyc(businessId, update);
  await logAdminAction({ adminId, adminName, action: "kyc_tier_updated", targetType: "business", targetId: String(businessId), details: { tier: data.verificationTier } });

  // Notify the business owner of KYC outcome
  if (updated?.ownerId) {
    const approved = update.isVerified === true;
    const rejected = update.isVerified === false;
    if (approved) {
      notifySeller(updated.ownerId, {
        type: "kyc_approved",
        title: "Your account has been verified",
        body: `Congratulations! Your business has been granted ${data.verificationTier} tier verification on Nafex Hub.`,
        metadata: { businessId, tier: data.verificationTier },
        relatedId: businessId,
      });
    } else if (rejected) {
      notifySeller(updated.ownerId, {
        type: "kyc_rejected",
        title: "Account verification update",
        body: data.kycNotes ? `Verification update: ${data.kycNotes}` : "Your verification status has been updated. Please contact support for details.",
        metadata: { businessId, tier: data.verificationTier, notes: data.kycNotes },
        relatedId: businessId,
      });
    }
  }
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

