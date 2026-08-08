import { ReviewsRepository } from "./reviews.repository";
import { notifySeller, notifyBuyer } from "../../lib/notify";
import { ForbiddenError, NotFoundError } from "../../shared/errors/AppError";

export class ReviewsService {
  private repository: ReviewsRepository;

  constructor(repository: ReviewsRepository) {
    this.repository = repository;
  }

  public async getBusinessReviews(businessId: number) {
    return await this.repository.getBusinessReviews(businessId);
  }

  public async createReview(userId: number, data: { businessId: number; rating: number; comment: string }) {
    const review = await this.repository.createReview({
      userId,
      businessId: data.businessId,
      rating: data.rating,
      comment: data.comment,
    });

    // Notify the business owner of the new review (best-effort)
    try {
      const business = await this.repository.getBusinessById(data.businessId);
      if (business?.ownerId) {
        notifySeller(business.ownerId, {
          type: "new_review",
          title: `New ${data.rating}★ review on your business`,
          body: data.comment ? data.comment.slice(0, 120) : `A buyer left a ${data.rating}-star rating.`,
          metadata: { businessId: data.businessId, rating: data.rating },
          actorId: userId,
          relatedId: data.businessId,
        });
      }
    } catch {}

    return review;
  }

  public async respondToReview(sellerId: number, reviewId: number, responseText: string) {
    const review = await this.repository.getReviewById(reviewId);
    if (!review) throw new NotFoundError("Review not found");

    const business = await this.repository.getBusinessById(review.businessId);
    if (!business || business.ownerId !== sellerId) {
      throw new ForbiddenError("Forbidden");
    }

    notifyBuyer(review.userId, {
      type: "review_response",
      title: `Seller responded to your review`,
      body: `"${responseText.slice(0, 120)}"`,
      metadata: { reviewId: review.id, businessId: review.businessId, response: responseText },
      actorId: sellerId,
      relatedId: review.businessId,
    });

    return { ok: true };
  }
}
