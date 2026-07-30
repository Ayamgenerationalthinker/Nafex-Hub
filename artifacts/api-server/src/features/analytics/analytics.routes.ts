import { Router } from "express";
import { optionalAuth } from "../../lib/auth-middleware";
import * as ctrl from "./analytics.controller";

const router = Router();

router.post("/analytics/track",                 optionalAuth, ctrl.trackEvent);
router.get("/analytics/business/:businessId",   ctrl.getBusinessAnalytics);

export default router;
