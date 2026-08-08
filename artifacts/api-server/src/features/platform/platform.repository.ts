import { db, favoritesTable, businessesTable, productsTable, notificationsTable, siteSettingsTable } from "@workspace/db";
import { eq, and, inArray, count, isNull } from "drizzle-orm";

// ── Favorites ─────────────────────────────────────────────────────────────────

export async function getFavoritesByUser(userId: number) {
  return db.select().from(favoritesTable).where(eq(favoritesTable.userId, userId));
}

export async function getBusinessesByIds(ids: number[]) {
  if (!ids.length) return [];
  return db.select().from(businessesTable).where(inArray(businessesTable.id, ids));
}

export async function getProductsWithBusinessByIds(ids: number[]) {
  if (!ids.length) return [];
  return db.select({
    id: productsTable.id,
    businessId: productsTable.businessId,
    name: productsTable.name,
    description: productsTable.description,
    price: productsTable.price,
    images: productsTable.images,
    createdAt: productsTable.createdAt,
    updatedAt: productsTable.updatedAt,
    businessName: businessesTable.name,
    businessLogo: businessesTable.logo,
  })
    .from(productsTable)
    .leftJoin(businessesTable, eq(productsTable.businessId, businessesTable.id))
    .where(inArray(productsTable.id, ids));
}

export async function findFavorite(userId: number, businessId?: number, productId?: number) {
  const condition = businessId
    ? and(eq(favoritesTable.userId, userId), eq(favoritesTable.businessId, businessId))
    : and(eq(favoritesTable.userId, userId), eq(favoritesTable.productId, productId!));
  return db.select().from(favoritesTable).where(condition);
}

export async function createFavorite(userId: number, businessId?: number, productId?: number) {
  const [fav] = await db.insert(favoritesTable).values({ userId, businessId: businessId ?? null, productId: productId ?? null }).returning();
  return fav!;
}

export async function deleteFavorite(id: number) {
  return db.delete(favoritesTable).where(eq(favoritesTable.id, id));
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function getNotifications(userId: number) {
  return db.select().from(notificationsTable).where(eq(notificationsTable.userId, userId)).orderBy(notificationsTable.createdAt).limit(30);
}

export async function getUnreadCount(userId: number) {
  const [result] = await db.select({ count: count() }).from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), isNull(notificationsTable.readAt)));
  return Number(result?.count ?? 0);
}

export async function markNotificationRead(id: number, userId: number) {
  return db.update(notificationsTable).set({ readAt: new Date() }).where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  return db.update(notificationsTable).set({ readAt: new Date() }).where(eq(notificationsTable.userId, userId));
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getAllSettings() {
  return db.select().from(siteSettingsTable);
}

export async function upsertSetting(key: string, value: string) {
  return db.insert(siteSettingsTable).values({ key, value })
    .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value, updatedAt: new Date() } });
}
