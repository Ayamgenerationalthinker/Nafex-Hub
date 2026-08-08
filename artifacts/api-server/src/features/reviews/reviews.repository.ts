import { db, reviewsTable, usersTable, businessesTable } from "@workspace/db";
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

  public async getBusinessById(businessId: number) {
    const [biz] = await db
      .select({ id: businessesTable.id, ownerId: businessesTable.ownerId })
      .from(businessesTable)
      .where(eq(businessesTable.id, businessId));
    return biz ?? null;
  }

  public async getReviewById(id: number) {
    const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
    return review ?? null;
  }
}
