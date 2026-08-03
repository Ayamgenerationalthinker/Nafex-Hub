import { Router } from "express";
import { requireAuth, optionalAuth } from "../../lib/auth-middleware";
import * as ctrl from "./admin.controller";

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get("/categories",              ctrl.getCategories);
router.get("/stats/summary",           ctrl.getPublicStats);
router.get("/admin/businesses",        requireAuth, ctrl.getAdminBusinesses);

// ── Admin: activity & stats ───────────────────────────────────────────────────
router.get("/admin/activity",          requireAuth, ctrl.getActivity);
router.get("/admin/stats",             requireAuth, ctrl.getAdminStats);
router.get("/admin/featured-analytics", requireAuth, ctrl.getFeaturedAnalytics);
router.get("/admin/financial-summary", requireAuth, ctrl.getFinancialSummary);

// ── Admin: users ──────────────────────────────────────────────────────────────
router.get("/admin/users",             requireAuth, ctrl.listUsers);
router.put("/admin/users/:id/role",    requireAuth, ctrl.changeUserRole);
router.delete("/admin/users/:id",      requireAuth, ctrl.deleteUser);

// ── Admin: product moderation ─────────────────────────────────────────────────
router.get("/admin/products/pending",        requireAuth, ctrl.getPendingProducts);
router.patch("/admin/product/:id/approve",   requireAuth, ctrl.approveProduct);
router.patch("/admin/product/:id/reject",    requireAuth, ctrl.rejectProduct);

// ── Admin: KYC ────────────────────────────────────────────────────────────────
router.patch("/admin/businesses/:id/kyc",    requireAuth, ctrl.updateKyc);

export default router;

// SKUs
router.get("/admin/skus", requireAuth, ctrl.getAdminSkus);

