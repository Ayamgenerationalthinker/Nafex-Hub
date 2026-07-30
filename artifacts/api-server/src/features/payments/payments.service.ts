import { PaymentsRepository } from "./payments.repository";
import { ForbiddenError, NotFoundError, AppError } from "../../shared/errors/AppError";
import { createHmac, timingSafeEqual } from "crypto";
import { env } from "../../config/env";

const PAYSTACK_SECRET = env.PAYSTACK_SECRET_KEY ?? "";
const PAYSTACK_BASE = "https://api.paystack.co";

export class PaymentsService {
  private repository: PaymentsRepository;

  constructor(repository: PaymentsRepository) {
    this.repository = repository;
  }

  public async paystackPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${PAYSTACK_BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { status: boolean; data: T; message: string };
    if (!res.ok || !data.status) throw new Error(data.message ?? "Paystack error");
    return data.data;
  }

  public async paystackGet<T>(path: string): Promise<T> {
    const res = await fetch(`${PAYSTACK_BASE}${path}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    const data = (await res.json()) as { status: boolean; data: T; message: string };
    if (!res.ok || !data.status) throw new Error(data.message ?? "Paystack error");
    return data.data;
  }

  public verifyWebhookSignature(body: string | Buffer, signature: string): boolean {
    if (!PAYSTACK_SECRET) return false;
    const hash = createHmac("sha512", PAYSTACK_SECRET).update(body).digest("hex");
    if (hash.length !== signature.length) return false;
    return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  }

  public async payoutToSeller(businessId: number, amountPesewas: number, orderId: number): Promise<boolean> {
    const biz = await this.repository.getBusinessById(businessId);
    if (!biz || !biz.paystackRecipientCode) {
      console.error(`Cannot payout to business ${businessId}: No Paystack recipient code found.`);
      return false;
    }

    try {
      await this.paystackPost("/transfer", {
        source: "balance",
        amount: amountPesewas,
        recipient: biz.paystackRecipientCode,
        reason: `Escrow release for Order #${orderId} from Nafex Hub`,
      });
      return true;
    } catch (error) {
      console.error(`Failed to transfer to business ${businessId}:`, error);
      return false;
    }
  }

  public async payoutToTradeSupplier(supplierId: number, amountPesewas: number, orderId: number): Promise<boolean> {
    const biz = await this.repository.getBusinessByOwnerId(supplierId);
    if (!biz || !biz.paystackRecipientCode) {
      console.error(`Cannot payout to supplier ${supplierId}: No Paystack recipient code found for their business.`);
      return false;
    }

    try {
      await this.paystackPost("/transfer", {
        source: "balance",
        amount: amountPesewas,
        recipient: biz.paystackRecipientCode,
        reason: `Escrow release for Trade Order #${orderId} from Nafex Hub`,
      });
      return true;
    } catch (error) {
      console.error(`Failed to transfer to supplier ${supplierId}:`, error);
      return false;
    }
  }

  public async initializePayment(userId: number, orderId: number, milestoneId?: number) {
    const order = await this.repository.getOrderById(orderId);
    if (!order) throw new NotFoundError("Order not found");
    if (order.userId !== userId) throw new ForbiddenError("Not your order");
    if (order.paymentStatus !== "unpaid" && order.paymentStatus !== "partial") {
      throw new AppError("Order already fully paid or settled", 409);
    }

    const reference = `NAF-${order.id}-${Date.now()}`;
    let amountPesewas = order.totalPrice;

    if (milestoneId && order.isB2b) {
      const milestones = (order.milestones as any[]) || [];
      const milestone = milestones.find((m) => m.id === milestoneId);
      if (!milestone) throw new NotFoundError("Milestone not found");
      if (milestone.status !== "pending") throw new AppError("Milestone already funded", 409);
      amountPesewas = milestone.amount;
    }

    await this.repository.createTransaction({
      orderId: order.id,
      userId,
      type: "payment",
      amount: (amountPesewas / 100).toString(),
      currency: "GHS",
      provider: "paystack",
      providerRef: reference,
      channel: "card",
      status: "pending",
      metadata: { orderId: order.id, milestoneId },
    });

    return { reference, amountPesewas, orderId: order.id };
  }

  public async verifyPayment(userId: number, orderId: number, reference: string) {
    if (!PAYSTACK_SECRET) throw new AppError("Payment gateway not configured", 503);

    const order = await this.repository.getOrderById(orderId);
    if (!order) throw new NotFoundError("Order not found");
    if (order.userId !== userId) throw new ForbiddenError("Not your order");

    try {
      const txData = await this.paystackGet<{
        status: string;
        reference: string;
        amount: number;
        channel: string;
        gateway_response: string;
      }>(`/transaction/verify/${encodeURIComponent(reference)}`);

      if (txData.status !== "success") {
        throw new AppError(`Payment not successful: ${txData.gateway_response}`, 402);
      }

      const pendingTx = await this.repository.getPendingTransaction(orderId, reference);
      const milestoneId = (pendingTx?.metadata as any)?.milestoneId;

      let newPaymentStatus: "partial" | "unpaid" | "in_escrow" | "released" | "refunded" = "in_escrow";
      let newMilestones = order.milestones as any[];

      if (order.isB2b && milestoneId) {
        newMilestones = (order.milestones as any[]).map(m => 
          m.id === milestoneId ? { ...m, status: "in_escrow" } : m
        );
        const allFunded = newMilestones.every(m => m.status !== "pending");
        newPaymentStatus = allFunded ? "in_escrow" : "partial";
      }

      const updatedOrder = await this.repository.updateOrderPaymentStatus(orderId, {
        paymentStatus: newPaymentStatus,
        paymentReference: reference,
        milestones: newMilestones,
      });

      await this.repository.updateTransactionStatus(orderId, reference, "success");

      try {
        const biz = await this.repository.getBusinessById(order.businessId);
        if (biz?.ownerId) {
          await this.repository.createNotification(
            biz.ownerId,
            "order_update",
            `Payment confirmed for Order #${order.id}`,
            `GHS ${(order.totalPrice / 100).toFixed(2)} is now held in escrow. Please process the order.`,
            order.id
          );
        }
      } catch {}

      return { order: updatedOrder, transaction: txData };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      throw new AppError((err as Error).message ?? "Verification failed", 502);
    }
  }

  public async handleWebhook(bodyToVerify: string | Buffer, signature: string, event: any) {
    if (!this.verifyWebhookSignature(bodyToVerify, signature)) {
      throw new ForbiddenError("Invalid signature");
    }

    if (event.event === "charge.success") {
      const { reference, metadata } = event.data;
      const orderId = metadata?.orderId;
      if (orderId) {
        await this.repository.updateOrderForWebhook(orderId, reference);
        await this.repository.updateTransactionStatus(orderId, reference, "success");
      }
    }
  }

  public async getUserTransactions(userId: number) {
    return await this.repository.getUserTransactions(userId);
  }

  public async getAllTransactions(userRole: string | undefined) {
    if (userRole !== "admin") throw new ForbiddenError("Admin access required");
    return await this.repository.getAllTransactions();
  }

  public async adminReleasePayout(userId: number, userRole: string | undefined, orderId: number) {
    if (userRole !== "admin") throw new ForbiddenError("Admin access required");

    const updated = await this.repository.atomicReleaseEscrow(orderId);
    if (!updated) {
      const existing = await this.repository.getOrderById(orderId);
      if (!existing) throw new NotFoundError("Order not found");
      throw new AppError(`Order is not in escrow (current state: ${existing.paymentStatus})`, 409);
    }

    const order = updated;

    const totalPriceGhs = order.totalPrice / 100;
    let commissionRate = 0.05;
    if (totalPriceGhs <= 100) commissionRate = 0.015;
    else if (totalPriceGhs <= 500) commissionRate = 0.03;

    const commissionPesewas = Math.floor(order.totalPrice * commissionRate);
    const payoutAmount = order.totalPrice - commissionPesewas;

    await this.payoutToSeller(order.businessId, payoutAmount, order.id);

    await this.repository.createTransaction({
      orderId: order.id,
      userId,
      type: "payout",
      amount: (payoutAmount / 100).toString(),
      currency: "GHS",
      provider: "paystack",
      providerRef: `PAYOUT-${order.id}-${Date.now()}`,
      status: "success",
      metadata: { releasedBy: userId, reason: "Admin manual release", commissionPesewas },
    });

    try {
      const biz = await this.repository.getBusinessById(order.businessId);
      if (biz?.ownerId) {
        await this.repository.createNotification(
          biz.ownerId,
          "order_update",
          `Payout released for Order #${order.id}`,
          `GHS ${(payoutAmount / 100).toFixed(2)} has been released from escrow to your account (minus GHS ${(commissionPesewas / 100).toFixed(2)} platform commission).`,
          order.id
        );
      }
    } catch {}

    return updated;
  }

  public async adminRefundOrder(userId: number, userRole: string | undefined, orderId: number, reason?: string) {
    if (userRole !== "admin") throw new ForbiddenError("Admin access required");

    const updated = await this.repository.atomicRefundOrder(orderId);
    if (!updated) {
      const existing = await this.repository.getOrderById(orderId);
      if (!existing) throw new NotFoundError("Order not found");
      throw new AppError(`Order cannot be refunded (current state: ${existing.paymentStatus})`, 409);
    }

    const order = updated;

    if (PAYSTACK_SECRET && order.paymentReference) {
      try {
        await this.paystackPost("/refund", {
          transaction: order.paymentReference,
          amount: order.totalPrice,
          currency: "GHS",
          merchant_note: reason ?? "Buyer refund via Nafex Hub admin",
        });
      } catch (err) {
        console.warn("Paystack refund call failed; DB marked refunded for manual handling", err);
      }
    }

    await this.repository.createTransaction({
      orderId: order.id,
      userId: order.userId,
      type: "refund",
      amount: (order.totalPrice / 100).toString(),
      currency: "GHS",
      provider: PAYSTACK_SECRET ? "paystack" : "manual",
      providerRef: `REFUND-${order.id}-${Date.now()}`,
      status: "success",
      metadata: { reason: reason, refundedBy: userId },
    });

    try {
      await this.repository.createNotification(
        order.userId,
        "order_update",
        `Refund processed for Order #${order.id}`,
        `Your refund of GHS ${(order.totalPrice / 100).toFixed(2)} has been processed. It may take 1-5 business days to reflect.`,
        order.id
      );
    } catch {}

    return updated;
  }
}
