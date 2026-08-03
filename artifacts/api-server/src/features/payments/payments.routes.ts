import { Router } from "express";
import express from "express";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PaymentsRepository } from "./payments.repository";
import { requireAuth } from "../../lib/auth-middleware";

const paymentsRepository = new PaymentsRepository();
export const paymentsService = new PaymentsService(paymentsRepository); // Exported so other modules can use it
const paymentsController = new PaymentsController(paymentsService);

const router = Router();

router.get("/config/paystack", (req, res, next) => {
  try { paymentsController.getPaystackConfig(req, res); } catch (e) { next(e); }
});

router.post("/payments/paystack/initialize", requireAuth, (req, res, next) => {
  paymentsController.initializePayment(req as any, res).catch(next);
});

router.post("/payments/paystack/verify", requireAuth, (req, res, next) => {
  paymentsController.verifyPayment(req as any, res).catch(next);
});

router.post("/payments/webhook/paystack", express.raw({ type: "application/json" }), (req, res, next) => {
  paymentsController.handleWebhook(req as any, res).catch(next);
});

router.get("/transactions", requireAuth, (req, res, next) => {
  paymentsController.getUserTransactions(req as any, res).catch(next);
});

router.get("/business/transactions", requireAuth, (req, res, next) => {
  paymentsController.getBusinessTransactions(req as any, res).catch(next);
});

router.get("/admin/transactions", requireAuth, (req, res, next) => {
  paymentsController.getAllTransactions(req as any, res).catch(next);
});

router.post("/admin/payouts/:orderId", requireAuth, (req, res, next) => {
  paymentsController.adminReleasePayout(req as any, res).catch(next);
});

router.post("/admin/refunds/:orderId", requireAuth, (req, res, next) => {
  paymentsController.adminRefundOrder(req as any, res).catch(next);
});

export default router;
