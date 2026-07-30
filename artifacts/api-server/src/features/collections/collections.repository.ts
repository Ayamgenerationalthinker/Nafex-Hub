import { db, collectionsTable, businessesTable, productsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { InferInsertModel } from "drizzle-orm";

type NewCollection = InferInsertModel<typeof collectionsTable>;

export class CollectionsRepository {
  public async getCollectionsByBusiness(businessId: number) {
    return await db
      .select()
      .from(collectionsTable)
      .where(eq(collectionsTable.businessId, businessId))
      .orderBy(asc(collectionsTable.createdAt));
  }

  public async getProductsByBusiness(businessId: number) {
    return await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.businessId, businessId))
      .orderBy(asc(productsTable.createdAt));
  }

  public async getBusinessOwner(businessId: number) {
    const [biz] = await db
      .select({ ownerId: businessesTable.ownerId })
      .from(businessesTable)
      .where(eq(businessesTable.id, businessId));
    return biz;
  }

  public async getCollectionWithBusiness(collectionId: number) {
    const [col] = await db
      .select({ businessId: collectionsTable.businessId })
      .from(collectionsTable)
      .where(eq(collectionsTable.id, collectionId));
    
    if (!col) return null;

    const [biz] = await db
      .select({ ownerId: businessesTable.ownerId })
      .from(businessesTable)
      .where(eq(businessesTable.id, col.businessId));
    
    return { collection: col, business: biz };
  }

  public async createCollection(data: NewCollection) {
    const [col] = await db.insert(collectionsTable).values(data).returning();
    return col;
  }

  public async updateCollection(id: number, data: Partial<NewCollection>) {
    const [updated] = await db
      .update(collectionsTable)
      .set(data)
      .where(eq(collectionsTable.id, id))
      .returning();
    return updated;
  }

  public async removeCollectionFromProducts(collectionId: number) {
    await db
      .update(productsTable)
      .set({ collectionId: null })
      .where(eq(productsTable.collectionId, collectionId));
  }

  public async deleteCollection(id: number) {
    await db.delete(collectionsTable).where(eq(collectionsTable.id, id));
  }
}
