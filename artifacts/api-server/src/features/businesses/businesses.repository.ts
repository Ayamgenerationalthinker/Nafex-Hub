import { db, businessesTable, reviewsTable, ordersTable } from "@workspace/db";
import { eq, ilike, and, or, isNull, SQL, sql, desc, gt } from "drizzle-orm";
import { InferInsertModel } from "drizzle-orm";

type NewBusiness = InferInsertModel<typeof businessesTable>;

export const bizWithStats = {
  id: businessesTable.id,
  ownerId: businessesTable.ownerId,
  name: businessesTable.name,
  category: businessesTable.category,
  description: businessesTable.description,
  location: businessesTable.location,
  phone: businessesTable.phone,
  logo: businessesTable.logo,
  images: businessesTable.images,
  isVerified: businessesTable.isVerified,
  isFeatured: businessesTable.isFeatured,
  featuredType: businessesTable.featuredType,
  featuredUntil: businessesTable.featuredUntil,
  createdAt: businessesTable.createdAt,
  updatedAt: businessesTable.updatedAt,
  avgRating: sql<number>`coalesce(round(avg(${reviewsTable.rating})::numeric,1),0)::float`,
  reviewCount: sql<number>`count(distinct ${reviewsTable.id})::int`,
};

export function featuredActiveCondition() {
  return and(
    eq(businessesTable.isFeatured, true),
    or(
      isNull(businessesTable.featuredUntil),
      gt(businessesTable.featuredUntil, sql`now()`)
    )
  );
}

export class BusinessesRepository {
  public async getBusinesses(search?: string, category?: string, verified?: boolean) {
    const conditions: SQL[] = [];
    conditions.push(
      or(
        eq(businessesTable.approvalStatus, "approved"),
        eq(businessesTable.approvalStatus, "pending"),
        isNull(businessesTable.approvalStatus)
      )!
    );
    
    if (search) {
      conditions.push(
        or(
          ilike(businessesTable.name, `%${search}%`),
          ilike(businessesTable.description, `%${search}%`),
          ilike(businessesTable.category, `%${search}%`)
        )!
      );
    }
    if (category && category !== "All") conditions.push(eq(businessesTable.category, category));
    if (verified === true) conditions.push(eq(businessesTable.isVerified, true));

    const searchBoostSort = sql`case when ${businessesTable.isFeatured} = true and ${businessesTable.featuredType} = 'search_boost' and (${businessesTable.featuredUntil} is null or ${businessesTable.featuredUntil} > now()) then 0 else 1 end`;

    return await db
      .select()
      .from(businessesTable)
      .where(and(...conditions))
      .orderBy(searchBoostSort, desc(businessesTable.createdAt));
  }

  public async getFeatured(type: string, limit: number) {
    return await db
      .select()
      .from(businessesTable)
      .where(
        and(
          featuredActiveCondition(),
          eq(businessesTable.featuredType, type as any),
          or(
            eq(businessesTable.approvalStatus, "approved"),
            eq(businessesTable.approvalStatus, "pending"),
            isNull(businessesTable.approvalStatus)
          )
        )
      )
      .limit(limit);
  }

  public async getTopVerified(limit: number) {
    return await db
      .select(bizWithStats)
      .from(businessesTable)
      .leftJoin(reviewsTable, eq(reviewsTable.businessId, businessesTable.id))
      .leftJoin(ordersTable, eq(ordersTable.businessId, businessesTable.id))
      .where(eq(businessesTable.isVerified, true))
      .groupBy(businessesTable.id)
      .orderBy(sql`count(distinct ${ordersTable.id}) desc`, desc(businessesTable.createdAt))
      .limit(limit);
  }

  public async getTrending(limit: number) {
    return await db
      .select(bizWithStats)
      .from(businessesTable)
      .leftJoin(reviewsTable, eq(reviewsTable.businessId, businessesTable.id))
      .leftJoin(
        ordersTable,
        and(eq(ordersTable.businessId, businessesTable.id), sql`${ordersTable.createdAt} > now() - interval '30 days'`)
      )
      .groupBy(businessesTable.id)
      .orderBy(sql`count(distinct ${ordersTable.id}) desc`, desc(businessesTable.createdAt))
      .limit(limit);
  }

  public async getVerifiedWithStats(limit: number) {
    return await db
      .select(bizWithStats)
      .from(businessesTable)
      .leftJoin(reviewsTable, eq(reviewsTable.businessId, businessesTable.id))
      .where(eq(businessesTable.isVerified, true))
      .groupBy(businessesTable.id)
      .orderBy(sql`coalesce(round(avg(${reviewsTable.rating})::numeric,1),0) desc`, desc(businessesTable.createdAt))
      .limit(limit);
  }

  public async getBusinessById(id: number) {
    const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, id));
    return biz;
  }

  public async createBusiness(data: NewBusiness) {
    const [biz] = await db.insert(businessesTable).values(data).returning();
    return biz;
  }

  public async updateBusiness(id: number, data: Partial<NewBusiness>) {
    const [biz] = await db.update(businessesTable).set(data).where(eq(businessesTable.id, id)).returning();
    return biz;
  }

  public async deleteBusiness(id: number) {
    const [biz] = await db.delete(businessesTable).where(eq(businessesTable.id, id)).returning();
    return biz;
  }
}
