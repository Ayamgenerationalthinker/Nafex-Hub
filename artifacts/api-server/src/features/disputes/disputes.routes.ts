import { Router } from "express";
import { DisputesController } from "./disputes.controller";
import { DisputesService } from "./disputes.service";
import { DisputesRepository } from "./disputes.repository";
import { requireAuth } from "../../lib/auth-middleware";

const disputesRepository = new DisputesRepository();
const disputesService = new DisputesService(disputesRepository);
const disputesController = new DisputesController(disputesService);

const router = Router();

router.post("/disputes", requireAuth, (req, res, next) => {
  disputesController.raiseDispute(req as any, res).catch(next);
});

router.get("/disputes", requireAuth, (req, res, next) => {
  disputesController.getUserDisputes(req as any, res).catch(next);
});

router.get("/disputes/:id", requireAuth, (req, res, next) => {
  disputesController.getDisputeById(req as any, res).catch(next);
});

router.get("/admin/disputes", requireAuth, (req, res, next) => {
  disputesController.getAllDisputes(req as any, res).catch(next);
});

router.patch("/admin/disputes/:id/review", requireAuth, (req, res, next) => {
  disputesController.reviewDispute(req as any, res).catch(next);
});

router.patch("/admin/disputes/:id/resolve", requireAuth, (req, res, next) => {
  disputesController.resolveDispute(req as any, res).catch(next);
});

export default router;
