import { ReviewsRepository } from "./reviews.repository";

export class ReviewsService {
  private repository: ReviewsRepository;

  constructor(repository: ReviewsRepository) {
    this.repository = repository;
  }

  public async getBusinessReviews(businessId: number) {
    return await this.repository.getBusinessReviews(businessId);
  }

  public async createReview(userId: number, data: { businessId: number; rating: number; comment: string }) {
    return await this.repository.createReview({
      userId,
      businessId: data.businessId,
      rating: data.rating,
      comment: data.comment,
    });
  }
}
