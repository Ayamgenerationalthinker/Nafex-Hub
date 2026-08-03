import * as repo from "./trade.repository";
import { paymentsService } from "../payments/payments.routes";
import { getIO } from "../../lib/socket";

const PAYSTACK_SECRET = process.env["PAYSTACK_SECRET_KEY"];
const PAYSTACK_BASE   = "https://api.paystack.co";

// ── Socket helper ─────────────────────────────────────────────────────────────

function emitTradeUpdate(orderId: number, event: string, data: unknown) {
  const io = getIO();
  if (io) io.to(`trade_${orderId}`).emit(event, data);
}

// ── Trade Requests ────────────────────────────────────────────────────────────

export async function createRequest(userId: number, userRole: string, data: {
  productName: string; quantity: number; budget: number; description: string;
  category?: string; images?: string[]; requesterRole?: "buyer" | "seller";
}) {
  let requesterRole: "buyer" | "seller" = data.requesterRole ?? "buyer";
  if (requesterRole === "seller" && userRole !== "business_owner" && userRole !== "admin") {
    return { error: "Only verified sellers can post seller sourcing requests", status: 403 };
  }

  const request = await repo.createRequest({
    userId,
    productName: data.productName,
    quantity: data.quantity,
    budget: data.budget.toString(),
    description: data.description,
    category: data.category,
    images: data.images ?? [],
    requesterRole,
  });
  
  // Notify all admins
  try {
    const admins = await repo.getAdmins();
    const io = getIO();
    for (const admin of admins) {
      const notif = await repo.createNotification(
        admin.id,
        "message",
        "New Sourcing Request",
        `A new sourcing request for "${data.productName}" was submitted by a ${requesterRole}.`,
        request.id
      );
      if (io) io.to(`user_${admin.id}`).emit("new_notification", notif);
    }
  } catch (err) {}

  return { data: request };
}

export async function listRequests() { return repo.getAllRequests(); }

export async function getMyRequests(userId: number) {
  const requests = await repo.getMyRequests(userId);
  return Promise.all(requests.map(async (r) => {
    const quotes = await repo.getQuotesByRequest(r.id);
    return { ...r, quoteCount: quotes.length };
  }));
}

export async function getRequestWithQuotes(id: number) {
  const request = await repo.getRequestById(id);
  if (!request) return null;
  const quotes = await repo.getQuotesByRequest(id);
  return { ...request, quotes };
}

export async function updateRequestStatus(id: number, userId: number, userRole: string, status: "pending" | "fulfilled" | "cancelled") {
  const request = await repo.getRequestById(id);
  if (!request) return { error: "Not found", status: 404 };
  if (request.userId !== userId && userRole !== "admin") return { error: "Not authorized", status: 403 };
  const updated = await repo.updateRequestStatus(id, status);
  return { data: updated };
}

// ── Quotes ────────────────────────────────────────────────────────────────────

export async function submitQuote(userId: number, data: {
  requestId: number; unitPrice: number; moq: number; shippingCost: number; productionTime: string; notes?: string; images?: string[];
}) {
  const request = await repo.getRequestById(data.requestId);
  if (!request) return { error: "Trade request not found", status: 404 };
  if (request.status !== "pending") return { error: "This request is no longer accepting quotes", status: 409 };
  if (request.userId === userId) return { error: "You cannot quote your own request", status: 400 };

  const supplierName = await repo.getSupplierName(userId);
  const quote = await repo.createQuote({
    requestId: data.requestId,
    supplierId: userId,
    supplierName,
    unitPrice: data.unitPrice.toString(),
    moq: data.moq,
    shippingCost: data.shippingCost.toString(),
    productionTime: data.productionTime,
    notes: data.notes,
    images: data.images,
  });
  return { data: quote };
}

export async function getQuotesByRequest(requestId: number) { return repo.getQuotesByRequest(requestId); }

// ── Order lifecycle ───────────────────────────────────────────────────────────

export async function acceptQuote(userId: number, quoteId: number) {
  const quote = await repo.getQuoteById(quoteId);
  if (!quote) return { error: "Quote not found", status: 404 };
  if (quote.status !== "pending") return { error: "Quote already accepted or rejected", status: 409 };

  const request = await repo.getRequestById(quote.requestId);
  if (!request) return { error: "Trade request not found", status: 404 };
  if (request.userId !== userId) return { error: "Only the request owner can accept quotes", status: 403 };

  const totalAmount = (parseFloat(quote.unitPrice) * request.quantity + parseFloat(quote.shippingCost)).toString();
  const order = await repo.createTradeOrder({ requestId: request.id, quoteId: quote.id, buyerId: request.userId, supplierId: quote.supplierId, totalAmount, quantity: request.quantity, productName: request.productName, supplierName: quote.supplierName });

  await repo.acceptQuote(quoteId);
  await repo.updateRequestStatus(request.id, "sourcing" as any);
  const escrow = await repo.createEscrow({ orderId: order.id, buyerId: request.userId, supplierId: quote.supplierId, amount: totalAmount });
  await repo.addTrackingEvent({ orderId: order.id, status: "pending", description: "Trade order created. Awaiting escrow payment from buyer.", createdBy: userId });

  return { data: { order, escrow } };
}

export async function initializeEscrow(userId: number, orderId: number) {
  const escrow = await repo.getEscrowByOrder(orderId);
  if (!escrow) return { error: "Escrow record not found", status: 404 };
  if (escrow.buyerId !== userId) return { error: "Only the buyer can fund escrow", status: 403 };
  if (escrow.paystackStatus === "success") return { error: "Escrow already funded", status: 409 };

  const email = await repo.getUserEmail(userId);
  if (!email) return { error: "User not found", status: 404 };

  const reference = `trade_escrow_${orderId}_${Date.now()}`;
  const amountPesewas = Math.round(parseFloat(escrow.amount) * 100);

  await repo.setEscrowPaystackRef(escrow.id, reference);
  return { data: { reference, amountPesewas, escrowId: escrow.id, email } };
}

export async function verifyEscrow(userId: number, orderId: number, reference: string) {
  const escrow = await repo.getEscrowByOrder(orderId);
  if (!escrow) return { error: "Escrow not found", status: 404 };
  if (escrow.buyerId !== userId) return { error: "Not authorized", status: 403 };
  if (escrow.paystackStatus === "success") return { data: { message: "Already funded" } };

  if (PAYSTACK_SECRET) {
    const psRes = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } });
    const psData = (await psRes.json()) as { data?: { status: string } };
    if (psData.data?.status !== "success") return { error: "Payment not yet confirmed by Paystack", status: 402 };
  }

  const funded = await repo.fundEscrow(escrow.id, reference);
  const updatedOrder = await repo.updateTradeOrderStatus(escrow.orderId, { escrowStatus: "funded", status: "sourcing" });
  await repo.addTrackingEvent({ orderId: escrow.orderId, status: "sourcing", description: `Escrow funded: GHS ${escrow.amount}. Supplier is now sourcing/confirming the order.`, createdBy: userId });

  emitTradeUpdate(escrow.orderId, "trade:escrow_funded", { orderId: escrow.orderId, amount: escrow.amount });
  emitTradeUpdate(escrow.orderId, "trade:status_updated", { orderId: escrow.orderId, status: "sourcing" });

  return { data: { escrow: { ...escrow, paystackStatus: "success" }, order: updatedOrder } };
}

export async function confirmDelivery(userId: number, orderId: number) {
  const order = await repo.getTradeOrderById(orderId);
  if (!order) return { error: "Order not found", status: 404 };
  if (order.buyerId !== userId) return { error: "Only the buyer can confirm delivery", status: 403 };
  if (order.escrowStatus !== "funded") return { error: "Escrow is not in funded state", status: 409 };
  if (order.buyerConfirmedDelivery) return { error: "Delivery already confirmed", status: 409 };

  const updatedOrder = await repo.updateTradeOrderStatus(orderId, { buyerConfirmedDelivery: true, status: "delivered", escrowStatus: "released" });
  const escrow = await repo.updateEscrow((await repo.getEscrowByOrder(orderId))!.id, { releasedAt: new Date() });

  if (escrow) {
    const amountPesewas = Math.round(parseFloat(escrow.amount) * 100);
    await paymentsService.payoutToTradeSupplier(order.supplierId, amountPesewas, order.id);
  }

  await repo.addTrackingEvent({ orderId, status: "delivered", description: "Buyer confirmed delivery. Escrow funds released to supplier.", createdBy: userId });
  emitTradeUpdate(orderId, "trade:status_updated", { orderId, status: "delivered", escrowStatus: "released" });

  return { data: updatedOrder };
}

export async function updateOrderStatus(userId: number, userRole: string, orderId: number, status: string, note?: string, location?: string) {
  const order = await repo.getTradeOrderById(orderId);
  if (!order) return { error: "Order not found", status: 404 };
  if (order.supplierId !== userId && userRole !== "admin") return { error: "Not authorized", status: 403 };

  const updatedOrder = await repo.updateTradeOrderStatus(orderId, { status });
  const statusLabels: Record<string, string> = {
    sourcing: "Supplier is sourcing the goods.",
    quoted: "Supplier has confirmed/re-quoted the order.",
    production: "Goods are in production.",
    shipped: "Goods have been shipped.",
    customs: "Shipment is in customs clearance.",
    delivered: "Goods delivered.",
  };

  await repo.addTrackingEvent({ orderId, status, description: note ?? statusLabels[status] ?? `Status updated to ${status}`, location: location ?? null, createdBy: userId });
  emitTradeUpdate(orderId, "trade:status_updated", { orderId, status });
  return { data: updatedOrder };
}

export async function addTrackingEvent(userId: number, userRole: string, orderId: number, data: { status: string; description: string; location?: string }) {
  const order = await repo.getTradeOrderById(orderId);
  if (!order) return { error: "Order not found", status: 404 };
  const canUpdate = order.supplierId === userId || order.buyerId === userId || userRole === "admin";
  if (!canUpdate) return { error: "Not authorized", status: 403 };

  const event = await repo.addTrackingEvent({ orderId, ...data, location: data.location ?? null, createdBy: userId });
  emitTradeUpdate(orderId, "trade:tracking_event", event);
  return { data: event };
}

export async function getOrderWithDetails(userId: number, userRole: string, orderId: number) {
  const order = await repo.getTradeOrderById(orderId);
  if (!order) return { error: "Order not found", status: 404 };
  const canView = order.supplierId === userId || order.buyerId === userId || userRole === "admin";
  if (!canView) return { error: "Not authorized", status: 403 };

  const escrow   = await repo.getEscrowByOrder(orderId);
  const tracking = await repo.getTrackingEvents(orderId);
  return { data: { ...order, escrow: escrow ?? null, tracking } };
}

export async function adminUpdateTradeOrder(userId: number, orderId: number, data: {
  status?: string; escrowAction?: "release" | "refund"; note?: string;
}, reqLog?: any) {
  const order = await repo.getTradeOrderById(orderId);
  if (!order) return { error: "Order not found", status: 404 };

  const updates: Record<string, unknown> = {};
  if (data.status) updates.status = data.status;

  if (data.escrowAction === "release") {
    const result = await repo.releaseEscrowAtomic(orderId);
    if (result.length === 0 && order.escrowStatus === "released") return { error: "Escrow already released", status: 409 };
    if (result.length > 0) {
      const escrow = result[0];
      const amountPesewas = Math.round(parseFloat(escrow!.amount) * 100);
      await paymentsService.payoutToTradeSupplier(order.supplierId, amountPesewas, order.id);
    }
    updates.escrowStatus = "released";
  } else if (data.escrowAction === "refund") {
    const refunded = await repo.refundEscrowAtomic(orderId);
    if (refunded.length === 0) return { error: "Escrow already refunded", status: 409 };
    const escrow = refunded[0]!;
    const PAYSTACK_SECRET = process.env["PAYSTACK_SECRET_KEY"] ?? "";
    if (PAYSTACK_SECRET && escrow.paystackRef && escrow.paystackStatus === "success") {
      try {
        const r = await fetch(`${PAYSTACK_BASE}/refund`, {
          method: "POST",
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, "Content-Type": "application/json" },
          body: JSON.stringify({ transaction: escrow.paystackRef, currency: escrow.currency ?? "GHS", merchant_note: data.note ?? "Trade Connect refund via Nafex Hub admin" }),
        });
        const payload = (await r.json().catch(() => ({}))) as { status?: boolean; message?: string };
        if (!r.ok || payload.status === false) reqLog?.warn?.({ paystackRef: escrow.paystackRef, status: r.status, message: payload.message }, "Paystack trade refund failed");
      } catch (err) {
        reqLog?.error?.({ err, paystackRef: escrow.paystackRef }, "Paystack trade refund threw");
      }
    }
    updates.escrowStatus = "refunded";
  }

  const updatedOrder = await repo.updateTradeOrderStatus(orderId, updates);
  if (data.status || data.note) {
    await repo.addTrackingEvent({ orderId, status: data.status ?? order.status, description: data.note ?? `Admin updated status to ${data.status ?? order.status}`, createdBy: userId });
  }

  emitTradeUpdate(orderId, "trade:status_updated", { orderId, status: updatedOrder?.status, escrowStatus: updatedOrder?.escrowStatus });
  return { data: updatedOrder };
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function assertOrderParticipant(orderId: number, userId: number | undefined, role: string | undefined) {
  if (userId === undefined) return { error: "Not authorized", status: 401 as const };
  const order = await repo.getTradeOrderById(orderId);
  if (!order) return { error: "Order not found", status: 404 as const };
  const allowed = role === "admin" || order.buyerId === userId || order.supplierId === userId;
  if (!allowed) return { error: "Not authorized", status: 403 as const };
  return { order };
}

export async function getMessages(userId: number, userRole: string, orderId: number) {
  const check = await assertOrderParticipant(orderId, userId, userRole);
  if ("error" in check) return check;
  return { data: await repo.getTradeMessages(orderId) };
}

export async function sendMessage(userId: number, userRole: string, orderId: number, text: string) {
  const check = await assertOrderParticipant(orderId, userId, userRole);
  if ("error" in check) return check;

  const payload = await repo.sendTradeMessage(orderId, userId, text);
  const io = getIO();
  if (io) io.to(`trade_${orderId}`).emit("trade_message", payload);
  return { data: payload };
}
