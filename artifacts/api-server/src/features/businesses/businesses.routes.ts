import { Router } from "express";
import { BusinessesController } from "./businesses.controller";
import { BusinessesService } from "./businesses.service";
import { BusinessesRepository } from "./businesses.repository";
import { requireAuth, requireVerified } from "../../lib/auth-middleware";

const businessesRepository = new BusinessesRepository();
const businessesService = new BusinessesService(businessesRepository);
const businessesController = new BusinessesController(businessesService);

const router = Router();

router.get("/businesses", (req, res, next) => {
  businessesController.getBusinesses(req, res).catch(next);
});

router.get("/businesses/featured", (req, res, next) => {
  businessesController.getFeatured(req, res).catch(next);
});

router.get("/businesses/featured-top", (req, res, next) => {
  businessesController.getFeaturedTop(req, res).catch(next);
});

router.get("/businesses/top", (req, res, next) => {
  businessesController.getTop(req, res).catch(next);
});

router.get("/businesses/trending", (req, res, next) => {
  businessesController.getTrending(req, res).catch(next);
});

router.get("/businesses/verified", (req, res, next) => {
  businessesController.getVerified(req, res).catch(next);
});

router.get("/businesses/:id", (req, res, next) => {
  businessesController.getBusinessById(req, res).catch(next);
});

router.post("/businesses", requireAuth, requireVerified, (req, res, next) => {
  businessesController.createBusiness(req as any, res).catch(next);
});

router.put("/businesses/:id", requireAuth, (req, res, next) => {
  businessesController.updateBusiness(req as any, res).catch(next);
});

router.post("/businesses/:id/settlement", requireAuth, (req, res, next) => {
  businessesController.setupSettlement(req as any, res).catch(next);
});

router.delete("/businesses/:id", requireAuth, (req, res, next) => {
  businessesController.deleteBusiness(req as any, res).catch(next);
});

router.delete("/admin/business/:id", requireAuth, (req, res, next) => {
  businessesController.adminDeleteBusiness(req as any, res).catch(next);
});

router.patch("/admin/businesses/:id/featured", requireAuth, (req, res, next) => {
  businessesController.adminFeatureBusiness(req as any, res).catch(next);
});

router.patch("/businesses/:id/verify", requireAuth, (req, res, next) => {
  businessesController.adminVerifyBusiness(req as any, res).catch(next);
});

router.get("/admin/debug-db", async (req, res) => {
  try {
    const { BusinessesRepository } = await import("./businesses.repository");
    const repo = new BusinessesRepository();
    const result = await repo.createBusiness({
      ownerId: 1, // assumes user 1 exists, but if it throws an FK error, we'll see it
      name: "Test Debug Business",
      category: "Test",
      description: "Testing insertion",
      location: "Accra",
      phone: "0000000000",
      logo: null,
      images: [],
      kycDocuments: [],
      approvalStatus: "approved"
    });
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, stack: err.stack, detail: err.detail, code: err.code, name: err.name });
  }
});

export default router;
