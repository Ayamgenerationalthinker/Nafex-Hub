import {
  db,
  tradeRequestsTable,
  tradeQuotesTable,
  tradeOrdersTable,
  tradeEscrowTable,
  tradeTrackingEventsTable,
  tradeMessagesTable,
  usersTable,
  businessesTable,
  transactionsTable,
  TRADE_ORDER_STATUSES,
  notificationsTable,
} from "@workspace/db";
import { eq, desc, and, or, isNull, asc } from "drizzle-orm";

// ── Trade Requests ────────────────────────────────────────────────────────────

export async function createRequest(data: {
  userId: number; productName: string; quantity: number; budget: string;
  description: string; category?: string; images: string[]; requesterRole: "buyer" | "seller";
}) {
  const [req] = await db.insert(tradeRequestsTable).values(data).returning();
  return req!;
}

export async function getAdmins() {
  return await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "admin"));
}

export async function createNotification(userId: number, type: "message" | "order_update" | "review", title: string, body: string, relatedId: number) {
  const [notif] = await db.insert(notificationsTable).values({
    userId, type, title, body, relatedId
  }).returning();
  return notif;
}

export async function getAllRequests() {
  return db.select({
    id: tradeRequestsTable.id,
    userId: tradeRequestsTable.userId,
    productName: tradeRequestsTable.productName,
    quantity: tradeRequestsTable.quantity,
    budget: tradeRequestsTable.budget,
    description: tradeRequestsTable.description,
    category: tradeRequestsTable.category,
    images: tradeRequestsTable.images,
    requesterRole: tradeRequestsTable.requesterRole,
    status: tradeRequestsTable.status,
    createdAt: tradeRequestsTable.createdAt,
    userName: usersTable.name,
  })
    .from(tradeRequestsTable)
    .leftJoin(usersTable, eq(tradeRequestsTable.userId, usersTable.id))
    .orderBy(desc(tradeRequestsTable.createdAt));
}

export async function getMyRequests(userId: number) {
  return db.select().from(tradeRequestsTable).where(eq(tradeRequestsTable.userId, userId)).orderBy(desc(tradeRequestsTable.createdAt));
}

export async function getRequestById(id: number) {
  const [req] = await db.select({
    id: tradeRequestsTable.id,
    userId: tradeRequestsTable.userId,
    productName: tradeRequestsTable.productName,
    quantity: tradeRequestsTable.quantity,
    budget: tradeRequestsTable.budget,
    description: tradeRequestsTable.description,
    status: tradeRequestsTable.status,
    createdAt: tradeRequestsTable.createdAt,
    userName: usersTable.name,
  })
    .from(tradeRequestsTable)
    .leftJoin(usersTable, eq(tradeRequestsTable.userId, usersTable.id))
    .where(eq(tradeRequestsTable.id, id));
  return req ?? null;
}

export async function updateRequestStatus(id: number, status: "pending" | "fulfilled" | "cancelled") {
  const [updated] = await db.update(tradeRequestsTable).set({ status, updatedAt: new Date() }).where(eq(tradeRequestsTable.id, id)).returning();
  return updated ?? null;
}

// ── Trade Quotes ──────────────────────────────────────────────────────────────

export async function getQuotesByRequest(requestId: number) {
  return db.select().from(tradeQuotesTable).where(eq(tradeQuotesTable.requestId, requestId)).orderBy(tradeQuotesTable.createdAt);
}

export async function getQuoteById(id: number) {
  const [q] = await db.select().from(tradeQuotesTable).where(eq(tradeQuotesTable.id, id));
  return q ?? null;
}

export async function createQuote(data: {
  requestId: number; supplierId: number; supplierName: string;
  unitPrice: string; moq: number; shippingCost: string; productionTime: string; notes?: string;
}) {
  const [quote] = await db.insert(tradeQuotesTable).values(data).returning();
  return quote!;
}

export async function acceptQuote(quoteId: number) {
  const [q] = await db.update(tradeQuotesTable).set({ status: "accepted", acceptedAt: new Date() }).where(eq(tradeQuotesTable.id, quoteId)).returning();
  return q!;
}

export async function getSupplierName(supplierId: number) {
  const [biz] = await db.select({ name: businessesTable.name }).from(businessesTable).where(eq(businessesTable.ownerId, supplierId));
  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, supplierId));
  return biz?.name ?? user?.name ?? "Anonymous";
}

export async function getUserEmail(userId: number) {
  const [user] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
  return user?.email ?? null;
}

// ── Trade Orders ──────────────────────────────────────────────────────────────

export async function createTradeOrder(data: {
  requestId: number; quoteId: number; buyerId: number; supplierId: number;
  totalAmount: string; quantity: number; productName: string; supplierName: string;
}) {
  const [order] = await db.insert(tradeOrdersTable).values(data).returning();
  return order!;
}

export async function getTradeOrderById(id: number) {
  const [order] = await db.select().from(tradeOrdersTable).where(eq(tradeOrdersTable.id, id));
  return order ?? null;
}

export async function updateTradeOrderStatus(id: number, updates: Record<string, unknown>) {
  const [updated] = await db.update(tradeOrdersTable).set({ ...updates, updatedAt: new Date() }).where(eq(tradeOrdersTable.id, id)).returning();
  return updated ?? null;
}

export async function getMyTradeOrders(buyerId: number) {
  return db.select().from(tradeOrdersTable).where(eq(tradeOrdersTable.buyerId, buyerId)).orderBy(desc(tradeOrdersTable.createdAt));
}

export async function getSupplierTradeOrders(supplierId: number) {
  return db.select().from(tradeOrdersTable).where(eq(tradeOrdersTable.supplierId, supplierId)).orderBy(desc(tradeOrdersTable.createdAt));
}

export async function getAllTradeOrdersAdmin() {
  return db.select({
    id: tradeOrdersTable.id,
    productName: tradeOrdersTable.productName,
    buyerId: tradeOrdersTable.buyerId,
    supplierId: tradeOrdersTable.supplierId,
    supplierName: tradeOrdersTable.supplierName,
    quantity: tradeOrdersTable.quantity,
    totalAmount: tradeOrdersTable.totalAmount,
    status: tradeOrdersTable.status,
    escrowStatus: tradeOrdersTable.escrowStatus,
    buyerConfirmedDelivery: tradeOrdersTable.buyerConfirmedDelivery,
    createdAt: tradeOrdersTable.createdAt,
    updatedAt: tradeOrdersTable.updatedAt,
    buyerName: usersTable.name,
  })
    .from(tradeOrdersTable)
    .leftJoin(usersTable, eq(tradeOrdersTable.buyerId, usersTable.id))
    .orderBy(desc(tradeOrdersTable.createdAt));
}

// ── Escrow ────────────────────────────────────────────────────────────────────

export async function createEscrow(data: { orderId: number; buyerId: number; supplierId: number; amount: string }) {
  const [escrow] = await db.insert(tradeEscrowTable).values(data).returning();
  return escrow!;
}

export async function getEscrowByOrder(orderId: number) {
  const [escrow] = await db.select().from(tradeEscrowTable).where(eq(tradeEscrowTable.orderId, orderId));
  return escrow ?? null;
}

export async function updateEscrow(id: number, updates: Record<string, unknown>) {
  const [updated] = await db.update(tradeEscrowTable).set(updates).where(eq(tradeEscrowTable.id, id)).returning();
  return updated ?? null;
}

export async function setEscrowPaystackRef(id: number, paystackRef: string) {
  return db.update(tradeEscrowTable).set({ paystackRef }).where(eq(tradeEscrowTable.id, id));
}

export async function fundEscrow(escrowId: number, paystackRef: string) {
  const [updated] = await db.update(tradeEscrowTable).set({ paystackStatus: "success", paystackRef, fundedAt: new Date() }).where(eq(tradeEscrowTable.id, escrowId)).returning();
  return updated ?? null;
}

export async function releaseEscrowAtomic(orderId: number) {
  return db.update(tradeEscrowTable).set({ releasedAt: new Date() })
    .where(and(eq(tradeEscrowTable.orderId, orderId), eq(tradeEscrowTable.paystackStatus, "success")))
    .returning();
}

export async function refundEscrowAtomic(orderId: number) {
  return db.update(tradeEscrowTable).set({ refundedAt: new Date() })
    .where(and(eq(tradeEscrowTable.orderId, orderId), isNull(tradeEscrowTable.refundedAt)))
    .returning();
}

export async function deactivateOtherBoosts(businessId: number) {
  return db.update(tradeOrdersTable).set({ escrowStatus: "released", updatedAt: new Date() }).where(and(eq(tradeOrdersTable.buyerId, businessId)));
}

// ── Tracking Events ───────────────────────────────────────────────────────────

export async function addTrackingEvent(data: { orderId: number; status: string; description: string; location?: string | null; createdBy: number }) {
  const [event] = await db.insert(tradeTrackingEventsTable).values(data).returning();
  return event!;
}

export async function getTrackingEvents(orderId: number) {
  return db.select().from(tradeTrackingEventsTable).where(eq(tradeTrackingEventsTable.orderId, orderId)).orderBy(desc(tradeTrackingEventsTable.createdAt));
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function getTradeMessages(orderId: number) {
  return db.select({
    id: tradeMessagesTable.id,
    orderId: tradeMessagesTable.orderId,
    senderId: tradeMessagesTable.senderId,
    text: tradeMessagesTable.text,
    createdAt: tradeMessagesTable.createdAt,
    senderName: usersTable.name,
  })
    .from(tradeMessagesTable)
    .leftJoin(usersTable, eq(tradeMessagesTable.senderId, usersTable.id))
    .where(eq(tradeMessagesTable.orderId, orderId))
    .orderBy(asc(tradeMessagesTable.createdAt));
}

export async function sendTradeMessage(orderId: number, senderId: number, text: string) {
  const [msg] = await db.insert(tradeMessagesTable).values({ orderId, senderId, text }).returning();
  const [sender] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, senderId));
  return { ...msg!, senderName: sender?.name ?? null };
}

export async function updateTransactionStatus(providerRef: string, status: "success" | "failed") {
  const now = new Date();
  return db.update(transactionsTable).set({ status, updatedAt: now }).where(eq(transactionsTable.providerRef, providerRef));
}
