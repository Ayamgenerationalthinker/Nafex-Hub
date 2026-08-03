import {
  db,
  adminActivityTable,
  usersTable,
  businessesTable,
  productsTable,
  productVariantsTable,
  transactionsTable,
  reviewsTable,
  conversationsTable,
  messagesTable,
  ordersTable,
  analyticsEventsTable,
  favoritesTable,
  notificationsTable,
  supportConversationsTable,
  supportMessagesTable,
  disputesTable,
  tradeRequestsTable,
  tradeQuotesTable,
  tradeOrdersTable,
  tradeEscrowTable,
  tradeTrackingEventsTable,
  ridersTable,
  siteSettingsTable,
  analyticsEventsTable as analyticsTable,
  flashSalesTable,
  servicesTable,
} from "@workspace/db";
import { eq, desc, or, and, ilike, sql, SQL, gt } from "drizzle-orm";
import { GetAdminBusinessesQueryParams } from "@workspace/api-zod";

// ── Activity ──────────────────────────────────────────────────────────────────

export async function getAdminActivity(limit: number) {
  return db
    .select()
    .from(adminActivityTable)
    .orderBy(desc(adminActivityTable.createdAt))
    .limit(limit);
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getAllUsers() {
  return db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, createdAt: usersTable.createdAt })
    .from(usersTable)
    .orderBy(usersTable.createdAt);
}

export async function getUserById(id: number) {
  return db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, id));
}

export async function updateUserRole(id: number, role: "user" | "business_owner" | "admin") {
  return db
    .update(usersTable)
    .set({ role })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, name: usersTable.name, role: usersTable.role });
}

export async function getAdminCount() {
  return db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "admin")).for("update");
}

export async function getOwnedBusinesses(userId: number) {
  return db
    .select({ id: businessesTable.id, name: businessesTable.name })
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, userId))
    .for("update");
}

export async function deleteUserCascade(id: number) {
  return db.transaction(async (tx) => {
    const [target] = await tx
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .for("update");

    if (!target) return { ok: false as const, status: 404, body: { error: "User not found" } };

    if (target.role === "admin") {
      const admins = await tx.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "admin")).for("update");
      if (admins.length <= 1) return { ok: false as const, status: 400, body: { error: "Cannot delete the last admin" } };
    }

    const ownedBusinesses = await tx
      .select({ id: businessesTable.id, name: businessesTable.name })
      .from(businessesTable)
      .where(eq(businessesTable.ownerId, id))
      .for("update");

    if (ownedBusinesses.length > 0) {
      return {
        ok: false as const,
        status: 409,
        body: {
          error: `User owns ${ownedBusinesses.length} business${ownedBusinesses.length === 1 ? "" : "es"}. Please delete or reassign them first.`,
          businesses: ownedBusinesses,
        },
      };
    }

    const userConvos = await tx.select({ id: conversationsTable.id }).from(conversationsTable).where(eq(conversationsTable.userId, id));
    for (const c of userConvos) await tx.delete(messagesTable).where(eq(messagesTable.conversationId, c.id));
    await tx.delete(messagesTable).where(eq(messagesTable.senderId, id));
    await tx.delete(conversationsTable).where(eq(conversationsTable.userId, id));

    const userSupportConvos = await tx.select({ id: supportConversationsTable.id }).from(supportConversationsTable).where(eq(supportConversationsTable.userId, id));
    for (const c of userSupportConvos) await tx.delete(supportMessagesTable).where(eq(supportMessagesTable.conversationId, c.id));
    await tx.delete(supportMessagesTable).where(eq(supportMessagesTable.senderId, id));
    await tx.delete(supportConversationsTable).where(eq(supportConversationsTable.userId, id));

    await tx.delete(reviewsTable).where(eq(reviewsTable.userId, id));
    await tx.delete(favoritesTable).where(eq(favoritesTable.userId, id));
    await tx.delete(notificationsTable).where(eq(notificationsTable.userId, id));
    await tx.delete(ordersTable).where(eq(ordersTable.userId, id));
    await tx.delete(analyticsEventsTable).where(eq(analyticsEventsTable.userId, id));
    await tx.delete(transactionsTable).where(eq(transactionsTable.userId, id));

    await tx.update(disputesTable).set({ resolvedBy: null }).where(eq(disputesTable.resolvedBy, id));
    await tx.delete(disputesTable).where(eq(disputesTable.userId, id));

    await tx.delete(tradeEscrowTable).where(or(eq(tradeEscrowTable.buyerId, id), eq(tradeEscrowTable.supplierId, id)));
    await tx.delete(tradeTrackingEventsTable).where(eq(tradeTrackingEventsTable.createdBy, id));
    await tx.delete(tradeOrdersTable).where(or(eq(tradeOrdersTable.buyerId, id), eq(tradeOrdersTable.supplierId, id)));
    await tx.delete(tradeQuotesTable).where(eq(tradeQuotesTable.supplierId, id));
    await tx.delete(tradeRequestsTable).where(eq(tradeRequestsTable.userId, id));

    await tx.update(ridersTable).set({ userId: null }).where(eq(ridersTable.userId, id));
    await tx.delete(usersTable).where(eq(usersTable.id, id));

    return { ok: true as const, target };
  });
}

// ── Products (moderation) ─────────────────────────────────────────────────────

export async function getPendingProducts() {
  return db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      images: productsTable.images,
      stock: productsTable.stock,
      approvalStatus: productsTable.approvalStatus,
      rejectionReason: productsTable.rejectionReason,
      createdAt: productsTable.createdAt,
      businessId: productsTable.businessId,
      businessName: businessesTable.name,
      businessLogo: businessesTable.logo,
    })
    .from(productsTable)
    .leftJoin(businessesTable, eq(productsTable.businessId, businessesTable.id))
    .where(eq(productsTable.approvalStatus, "pending"))
    .orderBy(productsTable.createdAt);
}

export async function approveProduct(id: number) {
  return db.update(productsTable).set({ approvalStatus: "approved", rejectionReason: null }).where(eq(productsTable.id, id));
}

export async function rejectProduct(id: number, reason: string) {
  return db.update(productsTable).set({ approvalStatus: "rejected", rejectionReason: reason }).where(eq(productsTable.id, id));
}

// ── KYC ───────────────────────────────────────────────────────────────────────

export async function updateBusinessKyc(id: number, updates: Record<string, unknown>) {
  return db.update(businessesTable).set(updates).where(eq(businessesTable.id, id));
}

// ── Financial summary ─────────────────────────────────────────────────────────

export async function getAllTransactions() {
  return db.select().from(transactionsTable);
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getAdminStats() {
  return Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(usersTable),
    db.select({ count: sql<number>`count(*)::int` }).from(businessesTable),
    db.select({ count: sql<number>`count(*)::int` }).from(businessesTable).where(eq(businessesTable.isVerified, true)),
    db.select({ count: sql<number>`count(*)::int` }).from(ordersTable),
    db.select({ count: sql<number>`count(*)::int` }).from(conversationsTable),
  ]);
}

export async function getAdminBusinesses(query: { search?: string; category?: string; verified?: string }) {
  const { search, category, verified } = query;
  const conditions: SQL[] = [];
  if (search) conditions.push(ilike(businessesTable.name, `%${search}%`));
  if (category && category !== "All") conditions.push(eq(businessesTable.category, category));
  if (verified === "true") conditions.push(eq(businessesTable.isVerified, true));
  if (verified === "false") conditions.push(eq(businessesTable.isVerified, false));

  return conditions.length > 0
    ? db.select().from(businessesTable).where(and(...conditions))
    : db.select().from(businessesTable);
}

export async function getPublicStats() {
  const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(businessesTable);
  const [verified] = await db.select({ count: sql<number>`count(*)::int` }).from(businessesTable).where(eq(businessesTable.isVerified, true));
  const categories = await db.select({ category: businessesTable.category }).from(businessesTable).groupBy(businessesTable.category);
  const [featured] = await db.select({ count: sql<number>`count(*)::int` }).from(businessesTable).where(eq(businessesTable.isFeatured, true));

  return { total, verified, categories, featured };
}

export async function getCategories() {
  return db
    .select({ category: businessesTable.category, count: sql<number>`count(*)::int` })
    .from(businessesTable)
    .groupBy(businessesTable.category);
}

export async function getFeaturedAnalytics() {
  const featuredBizRows = await db
    .select({ id: businessesTable.id, name: businessesTable.name, logo: businessesTable.logo, featuredType: businessesTable.featuredType, featuredUntil: businessesTable.featuredUntil })
    .from(businessesTable)
    .where(eq(businessesTable.isFeatured, true));

  if (!featuredBizRows.length) return { featuredBizRows: [], events: [] };

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const bizIds = featuredBizRows.map((b) => b.id);

  const events = await db
    .select({ businessId: analyticsTable.businessId, type: analyticsTable.type })
    .from(analyticsTable)
    .where(
      and(
        sql`${analyticsTable.businessId} = ANY(${sql`ARRAY[${sql.join(bizIds.map((id) => sql`${id}`), sql`, `)}]::int[]`})`,
        gt(analyticsTable.createdAt, since)
      )
    );

  return { featuredBizRows, events };
}

export async function getAdminSkus() {
  return db
    .select({
      id: productVariantsTable.id,
      sku: productVariantsTable.sku,
      attributes: productVariantsTable.attributes,
      stock: productVariantsTable.stock,
      price: productVariantsTable.price,
      productId: productsTable.id,
      productName: productsTable.name,
      productPrice: productsTable.price,
      category: productsTable.category,
      brand: productsTable.brand,
      model: productsTable.model,
    })
    .from(productVariantsTable)
    .innerJoin(productsTable, eq(productVariantsTable.productId, productsTable.id))
    .orderBy(desc(productVariantsTable.createdAt));
}
