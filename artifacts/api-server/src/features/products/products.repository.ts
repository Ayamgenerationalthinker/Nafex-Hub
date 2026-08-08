import { db, productsTable, businessesTable, favoritesTable, collectionsTable, reviewsTable, productVariantsTable } from "@workspace/db";
import { and, desc, eq, ilike, isNotNull, sql } from "drizzle-orm";
import { InferInsertModel } from "drizzle-orm";

type NewProduct = InferInsertModel<typeof productsTable>;

export class ProductsRepository {
  public async getAdminProducts(search?: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const where = search ? ilike(productsTable.name, `%${search}%`) : undefined;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productsTable)
      .where(where);

    const products = await db
      .select({
        id: productsTable.id,
        businessId: productsTable.businessId,
        name: productsTable.name,
        description: productsTable.description,
        price: productsTable.price,
        images: productsTable.images,
        stock: productsTable.stock,
        createdAt: productsTable.createdAt,
        businessName: businessesTable.name,
        businessLogo: businessesTable.logo,
      })
      .from(productsTable)
      .leftJoin(businessesTable, eq(productsTable.businessId, businessesTable.id))
      .where(where)
      .orderBy(desc(productsTable.createdAt))
      .limit(limit)
      .offset(offset);

    return { products, total: count, page, pages: Math.max(1, Math.ceil(count / limit)) };
  }

  public async getDiscountedProducts() {
    return await db
      .select({
        id: productsTable.id,
        businessId: productsTable.businessId,
        name: productsTable.name,
        description: productsTable.description,
        price: productsTable.price,
        discountPrice: productsTable.discountPrice,
        images: productsTable.images,
        stock: productsTable.stock,
        createdAt: productsTable.createdAt,
        businessName: businessesTable.name,
        businessLogo: businessesTable.logo,
      })
      .from(productsTable)
      .leftJoin(businessesTable, eq(productsTable.businessId, businessesTable.id))
      .where(
        and(
          isNotNull(productsTable.discountPrice),
          sql`${productsTable.discountPrice}::numeric < ${productsTable.price}::numeric`
        )
      )
      .orderBy(desc(productsTable.updatedAt));
  }

  public async getProducts(search?: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    return await db
      .select({
        id: productsTable.id,
        businessId: productsTable.businessId,
        collectionId: productsTable.collectionId,
        name: productsTable.name,
        description: productsTable.description,
        price: productsTable.price,
        discountPrice: productsTable.discountPrice,
        images: productsTable.images,
        stock: productsTable.stock,
        createdAt: productsTable.createdAt,
        updatedAt: productsTable.updatedAt,
        businessName: businessesTable.name,
        businessLogo: businessesTable.logo,
      })
      .from(productsTable)
      .leftJoin(businessesTable, eq(productsTable.businessId, businessesTable.id))
      .where(search ? sql`${productsTable.name} ILIKE ${'%' + search + '%'} OR ${productsTable.name} % ${search}` : undefined)
      .orderBy(search ? sql`${productsTable.name} <-> ${search}` : desc(productsTable.createdAt))
      .limit(limit)
      .offset(offset);
  }

  public async getProductsByBusiness(businessId: number) {
    return await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.businessId, businessId))
      .orderBy(productsTable.createdAt);
  }

  public async getProductById(id: number) {
    const [product] = await db
      .select({
        id: productsTable.id,
        businessId: productsTable.businessId,
        collectionId: productsTable.collectionId,
        name: productsTable.name,
        description: productsTable.description,
        price: productsTable.price,
        discountPrice: productsTable.discountPrice,
        images: productsTable.images,
        stock: productsTable.stock,
        createdAt: productsTable.createdAt,
        updatedAt: productsTable.updatedAt,
        businessName: businessesTable.name,
        businessLogo: businessesTable.logo,
        collectionName: collectionsTable.name,
      })
      .from(productsTable)
      .leftJoin(businessesTable, eq(productsTable.businessId, businessesTable.id))
      .leftJoin(collectionsTable, eq(productsTable.collectionId, collectionsTable.id))
      .where(eq(productsTable.id, id))
      .groupBy(productsTable.id, businessesTable.id, collectionsTable.id);
    
    return product;
  }

  public async getProductOwner(productId: number) {
    const [biz] = await db
      .select({ ownerId: businessesTable.ownerId })
      .from(businessesTable)
      .innerJoin(productsTable, eq(productsTable.businessId, businessesTable.id))
      .where(eq(productsTable.id, productId));
    
    return biz;
  }

  public async checkFavorite(userId: number, productId: number) {
    const [fav] = await db
      .select()
      .from(favoritesTable)
      .where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.productId, productId)));
    return !!fav;
  }

  public async createProduct(data: NewProduct) {
    const [product] = await db.insert(productsTable).values(data).returning();
    return product;
  }

  public async saveVariants(variants: any[]) {
    if (variants.length === 0) return [];
    return await db.insert(productVariantsTable).values(variants).returning();
  }

  public async getHighestVariantSequence(skuPrefix: string) {
    const prefix = `${skuPrefix}-%`;
    const res = await db.execute(sql`
      SELECT sku FROM ${productVariantsTable} 
      WHERE sku LIKE ${prefix} 
      ORDER BY sku DESC 
      LIMIT 1
    `);
    if (res.rows.length === 0) return 0;
    const lastSku = res.rows[0].sku as string;
    const parts = lastSku.split('-');
    const lastPart = parts[parts.length - 1];
    return parseInt(lastPart, 10) || 0;
  }

  public async updateProduct(id: number, data: Partial<NewProduct>) {
    const [product] = await db.update(productsTable).set(data).where(eq(productsTable.id, id)).returning();
    return product;
  }

  public async deleteProduct(id: number) {
    const [product] = await db.delete(productsTable).where(eq(productsTable.id, id)).returning();
    return product;
  }

  public async getBusinessOwner(businessId: number) {
    const [biz] = await db
      .select({ ownerId: businessesTable.ownerId })
      .from(businessesTable)
      .where(eq(businessesTable.id, businessId));
    return biz;
  }

  public async getFavoritedUserIds(productId: number): Promise<number[]> {
    const rows = await db
      .select({ userId: favoritesTable.userId })
      .from(favoritesTable)
      .where(eq(favoritesTable.productId, productId));
    return Array.from(new Set(rows.map((r) => r.userId)));
  }
}
