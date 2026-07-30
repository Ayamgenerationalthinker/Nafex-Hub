import { db, adBoostsTable, businessesTable, transactionsTable, flashSalesTable, productsTable, servicesTable } from "@workspace/db";
import { eq, and, desc, lte, gt, lt, inArray } from "drizzle-orm";
import { logAdminAction } from "../../lib/log-admin-action";

// ── Boosts ────────────────────────────────────────────────────────────────────

export async function getBusinessByOwner(ownerId: number) {
  const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.ownerId, ownerId));
  return biz ?? null;
}

export async function expireStaleBoosts(businessId: number) {
  const now = new Date();
  const expired = await db
    .select({ id: adBoostsTable.id })
    .from(adBoostsTable)
    .where(and(eq(adBoostsTable.businessId, businessId), eq(adBoostsTable.isActive, true), lte(adBoostsTable.expiresAt, now)));

  if (expired.length > 0) {
    await db.update(adBoostsTable).set({ isActive: false, updatedAt: now })
      .where(and(eq(adBoostsTable.businessId, businessId), eq(adBoostsTable.isActive, true), lte(adBoostsTable.expiresAt, now)));
    await db.update(businessesTable).set({ isFeatured: false, featuredType: null, featuredUntil: null, updatedAt: now })
      .where(eq(businessesTable.id, businessId));
  }
}

export async function getActiveBoost(businessId: number) {
  const [b] = await db.select().from(adBoostsTable)
    .where(and(eq(adBoostsTable.businessId, businessId), eq(adBoostsTable.isActive, true))).limit(1);
  return b ?? null;
}

export async function getBoostHistory(businessId: number) {
  return db.select().from(adBoostsTable).where(eq(adBoostsTable.businessId, businessId)).orderBy(desc(adBoostsTable.createdAt)).limit(20);
}

export async function getBusinessFeaturedStatus(businessId: number) {
  const [b] = await db.select({ isFeatured: businessesTable.isFeatured, featuredType: businessesTable.featuredType, featuredUntil: businessesTable.featuredUntil })
    .from(businessesTable).where(eq(businessesTable.id, businessId));
  return b ?? null;
}

export async function getBoostById(id: number) {
  const [b] = await db.select().from(adBoostsTable).where(eq(adBoostsTable.id, id));
  return b ?? null;
}

export async function createBoost(data: {
  businessId: number; tier: "basic" | "pro" | "premium"; durationDays: number; amount: string; currency: string; paymentRef: string;
}) {
  const [boost] = await db.insert(adBoostsTable).values({ ...data, paymentStatus: "pending", isActive: false }).returning();
  return boost!;
}

export async function createTransactionForBoost(userId: number, data: {
  amount: string; reference: string; boostId: number; businessId: number; tier: string;
}) {
  return db.insert(transactionsTable).values({
    userId,
    type: "payment",
    amount: data.amount,
    currency: "GHS",
    provider: "paystack",
    providerRef: data.reference,
    channel: "card",
    status: "pending",
    metadata: { boostId: data.boostId, businessId: data.businessId, tier: data.tier },
  });
}

export async function activateBoost(boostId: number, businessId: number, tier: string, durationDays: number, paymentRef: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  await db.update(adBoostsTable).set({ isActive: false, updatedAt: now })
    .where(and(eq(adBoostsTable.businessId, businessId), eq(adBoostsTable.isActive, true)));

  const [updated] = await db.update(adBoostsTable)
    .set({ paymentStatus: "paid", isActive: true, startsAt: now, expiresAt, updatedAt: now })
    .where(eq(adBoostsTable.id, boostId)).returning();

  const featuredTypeMap: Record<string, string> = { basic: "search_boost", pro: "homepage_section", premium: "homepage_top" };
  await db.update(businessesTable).set({ isFeatured: true, featuredType: featuredTypeMap[tier] ?? "search_boost", featuredUntil: expiresAt, updatedAt: now })
    .where(eq(businessesTable.id, businessId));
  await db.update(transactionsTable).set({ status: "success", updatedAt: now }).where(eq(transactionsTable.providerRef, paymentRef));

  return { updatedBoost: updated!, expiresAt };
}

// ── Flash Sales ───────────────────────────────────────────────────────────────

export async function getActiveFlashSales() {
  const now = new Date();
  return db.select({
    id: flashSalesTable.id,
    productId: flashSalesTable.productId,
    title: flashSalesTable.title,
    description: flashSalesTable.description,
    discountPercent: flashSalesTable.discountPercent,
    startsAt: flashSalesTable.startsAt,
    endsAt: flashSalesTable.endsAt,
    productName: productsTable.name,
    productPrice: productsTable.price,
    productImages: productsTable.images,
    businessId: businessesTable.id,
    businessName: businessesTable.name,
    businessLogo: businessesTable.logo,
  })
    .from(flashSalesTable)
    .innerJoin(productsTable, eq(productsTable.id, flashSalesTable.productId))
    .innerJoin(businessesTable, eq(businessesTable.id, productsTable.businessId))
    .where(and(eq(flashSalesTable.isActive, true), lt(flashSalesTable.startsAt, now), gt(flashSalesTable.endsAt, now)))
    .orderBy(desc(flashSalesTable.discountPercent))
    .limit(20);
}

export async function getAllFlashSales() {
  return db.select({
    id: flashSalesTable.id,
    productId: flashSalesTable.productId,
    title: flashSalesTable.title,
    description: flashSalesTable.description,
    discountPercent: flashSalesTable.discountPercent,
    startsAt: flashSalesTable.startsAt,
    endsAt: flashSalesTable.endsAt,
    isActive: flashSalesTable.isActive,
    createdAt: flashSalesTable.createdAt,
    productName: productsTable.name,
    businessName: businessesTable.name,
  })
    .from(flashSalesTable)
    .leftJoin(productsTable, eq(productsTable.id, flashSalesTable.productId))
    .leftJoin(businessesTable, eq(businessesTable.id, productsTable.businessId))
    .orderBy(desc(flashSalesTable.createdAt));
}

export async function getProductById(id: number) {
  const [p] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  return p ?? null;
}

export async function createFlashSale(data: {
  productId: number; title: string; description: string; discountPercent: number;
  startsAt: Date; endsAt: Date; createdBy: number;
}) {
  const [created] = await db.insert(flashSalesTable).values(data).returning();
  return created!;
}

export async function updateFlashSaleActive(id: number, isActive: boolean) {
  const [updated] = await db.update(flashSalesTable).set({ isActive }).where(eq(flashSalesTable.id, id)).returning();
  return updated ?? null;
}

export async function deleteFlashSale(id: number) {
  return db.delete(flashSalesTable).where(eq(flashSalesTable.id, id)).returning();
}

// ── Services ──────────────────────────────────────────────────────────────────

export async function getActiveServices() {
  return db.select().from(servicesTable).where(eq(servicesTable.isActive, true)).orderBy(servicesTable.createdAt);
}

export async function getAllServices() {
  return db.select().from(servicesTable).orderBy(servicesTable.createdAt);
}

export async function createService(data: { title: string; description: string; image?: string | null; isActive: boolean }) {
  const [s] = await db.insert(servicesTable).values(data).returning();
  return s!;
}

export async function updateService(id: number, data: { title: string; description: string; image?: string | null; isActive: boolean }) {
  const [s] = await db.update(servicesTable).set({ ...data, updatedAt: new Date() }).where(eq(servicesTable.id, id)).returning();
  return s ?? null;
}

export async function getServiceById(id: number) {
  const [s] = await db.select().from(servicesTable).where(eq(servicesTable.id, id));
  return s ?? null;
}

export async function toggleService(id: number) {
  const current = await getServiceById(id);
  if (!current) return null;
  const [s] = await db.update(servicesTable).set({ isActive: !current.isActive, updatedAt: new Date() }).where(eq(servicesTable.id, id)).returning();
  return s ?? null;
}

export async function deleteService(id: number) {
  const [s] = await db.delete(servicesTable).where(eq(servicesTable.id, id)).returning();
  return s ?? null;
}
