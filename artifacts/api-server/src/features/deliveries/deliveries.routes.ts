import { Router } from "express";
import { DeliveriesController } from "./deliveries.controller";
import { DeliveriesService } from "./deliveries.service";
import { DeliveriesRepository } from "./deliveries.repository";
import { requireAuth, optionalAuth } from "../../lib/auth-middleware";

const deliveriesRepository = new DeliveriesRepository();
const deliveriesService = new DeliveriesService(deliveriesRepository);
const deliveriesController = new DeliveriesController(deliveriesService);

const router = Router();

router.post("/deliveries", requireAuth, (req, res, next) => {
  deliveriesController.createDelivery(req as any, res).catch(next);
});

router.get("/deliveries/track/:code", optionalAuth, (req, res, next) => {
  deliveriesController.trackDelivery(req, res).catch(next);
});

router.get("/deliveries/order/:orderId", requireAuth, (req, res, next) => {
  deliveriesController.getDeliveryByOrderId(req as any, res).catch(next);
});

router.get("/deliveries/fee-estimate", (req, res, next) => {
  deliveriesController.getFeeEstimate(req, res).catch(next);
});

router.get("/deliveries/:id", requireAuth, (req, res, next) => {
  deliveriesController.getDeliveryById(req as any, res).catch(next);
});

router.patch("/deliveries/:id/status", requireAuth, (req, res, next) => {
  deliveriesController.updateStatus(req as any, res).catch(next);
});

router.patch("/deliveries/:id/assign", requireAuth, (req, res, next) => {
  deliveriesController.assignRider(req as any, res).catch(next);
});

router.get("/admin/deliveries", requireAuth, (req, res, next) => {
  deliveriesController.getAllDeliveries(req as any, res).catch(next);
});

export default router;
