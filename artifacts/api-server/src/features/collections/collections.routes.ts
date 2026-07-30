import { Router } from "express";
import { CollectionsController } from "./collections.controller";
import { CollectionsService } from "./collections.service";
import { CollectionsRepository } from "./collections.repository";
import { requireAuth } from "../../lib/auth-middleware";

const collectionsRepository = new CollectionsRepository();
const collectionsService = new CollectionsService(collectionsRepository);
const collectionsController = new CollectionsController(collectionsService);

const router = Router();

router.get("/collections", (req, res, next) => {
  collectionsController.getCollections(req, res).catch(next);
});

router.post("/collections", requireAuth, (req, res, next) => {
  collectionsController.createCollection(req as any, res).catch(next);
});

router.put("/collections/:id", requireAuth, (req, res, next) => {
  collectionsController.updateCollection(req as any, res).catch(next);
});

router.delete("/collections/:id", requireAuth, (req, res, next) => {
  collectionsController.deleteCollection(req as any, res).catch(next);
});

export default router;
