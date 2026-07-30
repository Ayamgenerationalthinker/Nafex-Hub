import { db, reviewsTable, usersTable } from "@workspace/db";
import { eq, InferInsertModel } from "drizzle-orm";

type NewReview = InferInsertModel<typeof reviewsTable>;

export class ReviewsRepository {
  public async getBusinessReviews(businessId: number) {
    return await db
      .select({
        id: reviewsTable.id,
        userId: reviewsTable.userId,
        businessId: reviewsTable.businessId,
        rating: reviewsTable.rating,
        comment: reviewsTable.comment,
        createdAt: reviewsTable.createdAt,
        userName: usersTable.name,
      })
      .from(reviewsTable)
      .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
      .where(eq(reviewsTable.businessId, businessId))
      .orderBy(reviewsTable.createdAt);
  }

  public async createReview(data: NewReview) {
    const [review] = await db.insert(reviewsTable).values(data).returning();
    return review;
  }
}
