import { Router } from "express";
import { ReviewsController } from "./reviews.controller";
import { ReviewsService } from "./reviews.service";
import { ReviewsRepository } from "./reviews.repository";
import { requireAuth } from "../../lib/auth-middleware";

const reviewsRepository = new ReviewsRepository();
const reviewsService = new ReviewsService(reviewsRepository);
const reviewsController = new ReviewsController(reviewsService);

const router = Router();

router.get("/businesses/:id/reviews", (req, res, next) => {
  reviewsController.getBusinessReviews(req, res).catch(next);
});

router.post("/reviews", requireAuth, (req, res, next) => {
  reviewsController.createReview(req as any, res).catch(next);
});

export default router;
