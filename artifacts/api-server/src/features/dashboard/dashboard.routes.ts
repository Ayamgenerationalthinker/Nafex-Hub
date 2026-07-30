import { Router } from "express";
import { requireAuth } from "../../lib/auth-middleware";
import * as ctrl from "./dashboard.controller";

const router = Router();

router.get("/dashboard/stats",               requireAuth, ctrl.getStats);
router.get("/dashboard/earnings",            requireAuth, ctrl.getEarnings);
router.get("/dashboard/product-performance", requireAuth, ctrl.getProductPerformance);
router.get("/dashboard/boost-status",        requireAuth, ctrl.getBoostStatus);

export default router;
