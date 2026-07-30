import { Router } from "express";
import { HealthController } from "./health.controller";

const router = Router();
const healthController = new HealthController();

router.get("/healthz", (req, res) => healthController.check(req, res));

export default router;
