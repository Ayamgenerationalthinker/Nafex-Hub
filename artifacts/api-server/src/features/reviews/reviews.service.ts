import { ReviewsRepository } from "./reviews.repository";
import { notifySeller } from "../../lib/notify";

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
}
