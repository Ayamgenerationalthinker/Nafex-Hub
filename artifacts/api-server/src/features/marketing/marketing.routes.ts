import { Router } from "express";
import { requireAuth } from "../../lib/auth-middleware";
import * as ctrl from "./marketing.controller";

const router = Router();

// ── Boosts ────────────────────────────────────────────────────────────────────
router.get("/boosts/tiers",       ctrl.getBoostTiers);
router.get("/boosts/my",          requireAuth, ctrl.getMyBoosts);
router.post("/boosts/initialize", requireAuth, ctrl.initializeBoost);
router.post("/boosts/verify",     requireAuth, ctrl.verifyBoost);
router.post("/boosts/webhook",    ctrl.boostWebhook);

// ── Flash Sales ───────────────────────────────────────────────────────────────
router.get("/flash-sales/active",         ctrl.getActiveFlashSales);
router.get("/admin/flash-sales",          requireAuth, ctrl.getAllFlashSales);
router.post("/admin/flash-sales",         requireAuth, ctrl.createFlashSale);
router.patch("/admin/flash-sales/:id",    requireAuth, ctrl.toggleFlashSale);
router.delete("/admin/flash-sales/:id",   requireAuth, ctrl.deleteFlashSale);

// ── Services ──────────────────────────────────────────────────────────────────
router.get("/services",                       ctrl.getActiveServices);
router.get("/admin/services",                 requireAuth, ctrl.getAllAdminServices);
router.post("/admin/services",                requireAuth, ctrl.createService);
router.put("/admin/services/:id",             requireAuth, ctrl.updateService);
router.patch("/admin/services/:id/toggle",    requireAuth, ctrl.toggleService);
router.delete("/admin/services/:id",          requireAuth, ctrl.deleteService);

// ── Newsletter ────────────────────────────────────────────────────────────────
router.post("/newsletter/subscribe",    ctrl.subscribeNewsletter);
router.get("/newsletter/submissions",   ctrl.getNewsletterSubmissions);

export default router;
