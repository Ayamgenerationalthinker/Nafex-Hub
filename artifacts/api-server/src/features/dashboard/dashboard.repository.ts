import {
  db,
  businessesTable,
  ordersTable,
  conversationsTable,
  reviewsTable,
  analyticsEventsTable,
  transactionsTable,
  productsTable,
  adBoostsTable,
} from "@workspace/db";
import { eq, and, count, avg, desc, lte } from "drizzle-orm";

export async function getBusinessByOwner(ownerId: number) {
  const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.ownerId, ownerId));
  return biz ?? null;
}

export async function getDashboardStats(businessId: number) {
  const [orderStats]   = await db.select({ total: count() }).from(ordersTable).where(eq(ordersTable.businessId, businessId));
  const [pendingStats] = await db.select({ total: count() }).from(ordersTable).where(and(eq(ordersTable.businessId, businessId), eq(ordersTable.status, "pending")));
  const [convStats]    = await db.select({ total: count() }).from(conversationsTable).where(eq(conversationsTable.businessId, businessId));
  const [reviewStats]  = await db.select({ total: count(), avgRating: avg(reviewsTable.rating) }).from(reviewsTable).where(eq(reviewsTable.businessId, businessId));
  const [viewStats]    = await db.select({ total: count() }).from(analyticsEventsTable).where(and(eq(analyticsEventsTable.businessId, businessId), eq(analyticsEventsTable.type, "view")));

  return { orderStats, pendingStats, convStats, reviewStats, viewStats };
}

export async function getOrdersByBusiness(businessId: number) {
  return db
    .select({ totalPrice: ordersTable.totalPrice, paymentStatus: ordersTable.paymentStatus, status: ordersTable.status, createdAt: ordersTable.createdAt })
    .from(ordersTable)
    .where(eq(ordersTable.businessId, businessId))
    .orderBy(desc(ordersTable.createdAt));
}

export async function getRecentTransactions(userId: number) {
  return db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(15);
}

export async function getProductsByBusiness(businessId: number) {
  return db.select().from(productsTable).where(eq(productsTable.businessId, businessId));
}

export async function getOrderItemsByBusiness(businessId: number) {
  return db
    .select({ items: ordersTable.items, status: ordersTable.status })
    .from(ordersTable)
    .where(eq(ordersTable.businessId, businessId));
}

export async function getStaleBoosts(businessId: number) {
  const now = new Date();
  return db
    .select({ id: adBoostsTable.id })
    .from(adBoostsTable)
    .where(and(eq(adBoostsTable.businessId, businessId), eq(adBoostsTable.isActive, true), lte(adBoostsTable.expiresAt, now)));
}

export async function expireStaleBoosts(businessId: number) {
  const now = new Date();
  await db.update(adBoostsTable).set({ isActive: false, updatedAt: now })
    .where(and(eq(adBoostsTable.businessId, businessId), eq(adBoostsTable.isActive, true), lte(adBoostsTable.expiresAt, now)));
  await db.update(businessesTable).set({ isFeatured: false, featuredType: null, featuredUntil: null, updatedAt: now })
    .where(eq(businessesTable.id, businessId));
}

export async function getActiveBoost(businessId: number) {
  const [boost] = await db
    .select()
    .from(adBoostsTable)
    .where(and(eq(adBoostsTable.businessId, businessId), eq(adBoostsTable.isActive, true)))
    .limit(1);
  return boost ?? null;
}
