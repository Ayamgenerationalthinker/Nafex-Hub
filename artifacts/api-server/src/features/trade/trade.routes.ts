import { Router } from "express";
import { requireAuth } from "../../lib/auth-middleware";
import * as ctrl from "./trade.controller";

const router = Router();

// ── Trade Requests ────────────────────────────────────────────────────────────
router.post("/trade/request",                   requireAuth, ctrl.createRequest);
router.get("/trade/requests",                   requireAuth, ctrl.listRequests);
router.get("/trade/my-requests",               requireAuth, ctrl.getMyRequests);
router.get("/trade/request/:id",               requireAuth, ctrl.getRequest);
router.patch("/trade/request/:id/status",      requireAuth, ctrl.updateRequestStatus);

// ── Trade Quotes ──────────────────────────────────────────────────────────────
router.post("/trade/quote",                    requireAuth, ctrl.submitQuote);
router.get("/trade/quotes/:requestId",         requireAuth, ctrl.getQuotes);
router.post("/trade/quotes/:id/accept",        requireAuth, ctrl.acceptQuote);

// ── Escrow ────────────────────────────────────────────────────────────────────
router.post("/trade/escrow/:orderId/initialize", requireAuth, ctrl.initializeEscrow);
router.post("/trade/escrow/:orderId/verify",     requireAuth, ctrl.verifyEscrow);

// ── Trade Orders ──────────────────────────────────────────────────────────────
router.post("/trade/orders/:id/confirm-delivery", requireAuth, ctrl.confirmDelivery);
router.patch("/trade/orders/:id/status",          requireAuth, ctrl.updateOrderStatus);
router.post("/trade/orders/:id/tracking",         requireAuth, ctrl.addTrackingEvent);
router.get("/trade/orders/:id/tracking",          requireAuth, ctrl.getTracking);
router.get("/trade/orders/:id",                   requireAuth, ctrl.getOrder);
router.get("/trade/orders/my",                    requireAuth, ctrl.getMyOrders);
router.get("/trade/orders/supplier",              requireAuth, ctrl.getSupplierOrders);

// ── Admin: Trade ──────────────────────────────────────────────────────────────
router.get("/admin/trade-orders",              requireAuth, ctrl.getAllAdminTradeOrders);
router.patch("/admin/trade-orders/:id",        requireAuth, ctrl.adminUpdateTradeOrder);

// ── Trade Messages ────────────────────────────────────────────────────────────
router.get("/trade/orders/:id/messages",       requireAuth, ctrl.getMessages);
router.post("/trade/orders/:id/messages",      requireAuth, ctrl.sendMessage);

export default router;
