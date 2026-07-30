import { Router } from "express";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrdersRepository } from "./orders.repository";
import { requireAuth, requireVerified } from "../../lib/auth-middleware";

const ordersRepository = new OrdersRepository();
const ordersService = new OrdersService(ordersRepository);
const ordersController = new OrdersController(ordersService);

const router = Router();

router.post("/orders", requireAuth, requireVerified, (req, res, next) => {
  ordersController.createOrder(req as any, res).catch(next);
});

router.post("/orders/:id/pay", requireAuth, (req, res, next) => {
  ordersController.payOrder(req as any, res).catch(next);
});

router.get("/orders/user", requireAuth, (req, res, next) => {
  ordersController.getUserOrders(req as any, res).catch(next);
});

router.get("/orders/business", requireAuth, (req, res, next) => {
  ordersController.getBusinessOrders(req as any, res).catch(next);
});

router.patch("/orders/:id/status", requireAuth, (req, res, next) => {
  ordersController.updateOrderStatus(req as any, res).catch(next);
});

router.post("/orders/:id/confirm-delivery", requireAuth, (req, res, next) => {
  ordersController.confirmDelivery(req as any, res).catch(next);
});

router.get("/orders/:id", requireAuth, (req, res, next) => {
  ordersController.getOrderById(req as any, res).catch(next);
});

router.post("/orders/:id/milestone", requireAuth, (req, res, next) => {
  ordersController.payMilestone(req as any, res).catch(next);
});

router.get("/admin/orders", requireAuth, (req, res, next) => {
  ordersController.getAllOrders(req as any, res).catch(next);
});

router.patch("/admin/order/:id", requireAuth, (req, res, next) => {
  ordersController.adminOverrideOrder(req as any, res).catch(next);
});

export default router;
