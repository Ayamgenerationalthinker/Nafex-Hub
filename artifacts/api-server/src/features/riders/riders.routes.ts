import { Router } from "express";
import { RidersController } from "./riders.controller";
import { RidersService } from "./riders.service";
import { RidersRepository } from "./riders.repository";
import { requireAuth } from "../../lib/auth-middleware";

const ridersRepository = new RidersRepository();
const ridersService = new RidersService(ridersRepository);
const ridersController = new RidersController(ridersService);

const router = Router();

router.get("/riders", requireAuth, (req, res, next) => {
  ridersController.getRiders(req as any, res).catch(next);
});

router.get("/riders/available", requireAuth, (req, res, next) => {
  ridersController.getAvailableRiders(req as any, res).catch(next);
});

router.post("/riders", requireAuth, (req, res, next) => {
  ridersController.createRider(req as any, res).catch(next);
});

router.patch("/riders/:id", requireAuth, (req, res, next) => {
  ridersController.updateRider(req as any, res).catch(next);
});

router.patch("/riders/:id/availability", requireAuth, (req, res, next) => {
  ridersController.toggleAvailability(req as any, res).catch(next);
});

export default router;
