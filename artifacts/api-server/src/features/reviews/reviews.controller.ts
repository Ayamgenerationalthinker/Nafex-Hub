import { Request, Response } from "express";
import { z } from "zod";
import { ReviewsService } from "./reviews.service";
import { ValidationError } from "../../shared/errors/AppError";
import type { AuthRequest } from "../../lib/auth-middleware";

const CreateReviewBody = z.object({
  businessId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().default(""),
});

const GetReviewsParams = z.object({
  id: z.coerce.number().int().positive(),
});

export class ReviewsController {
  private service: ReviewsService;

  constructor(service: ReviewsService) {
    this.service = service;
  }

  public async getBusinessReviews(req: Request, res: Response): Promise<void> {
    const params = GetReviewsParams.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error.message);

    const reviews = await this.service.getBusinessReviews(params.data.id);
    res.json(reviews);
  }

  public async createReview(req: AuthRequest, res: Response): Promise<void> {
    const parsed = CreateReviewBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const review = await this.service.createReview(req.userId!, parsed.data);
    res.status(201).json({ ...review, userName: undefined });
  }
}
