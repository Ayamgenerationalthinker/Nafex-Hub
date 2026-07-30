import { DisputesRepository } from "./disputes.repository";
import { ForbiddenError, NotFoundError, AppError } from "../../shared/errors/AppError";
import { paymentsService } from "../payments/payments.routes";
import { env } from "../../config/env";

export class DisputesService {
  private repository: DisputesRepository;

  constructor(repository: DisputesRepository) {
    this.repository = repository;
  }

  public async raiseDispute(userId: number, data: any) {
    const order = await this.repository.getOrderById(data.orderId);
    if (!order) throw new NotFoundError("Order not found");
    if (order.userId !== userId) throw new ForbiddenError("Not your order");
    if (order.paymentStatus === "unpaid") throw new AppError("Cannot dispute an unpaid order", 409);

    const existing = await this.repository.getDispute(data.orderId, userId);
    if (existing && ["open", "under_review"].includes(existing.status)) {
      throw new AppError("You already have an open dispute for this order", 409);
    }

    const dispute = await this.repository.createDispute({
      orderId: data.orderId,
      userId,
      reason: data.reason,
      description: data.description,
      evidenceUrls: data.evidenceUrls,
      status: "open",
    });

    try {
      const biz = await this.repository.getBusinessOwnerId(order.businessId);
      if (biz?.ownerId) {
        await this.repository.createNotification(
          biz.ownerId,
          "order_update",
          `Dispute raised on Order #${order.id}`,
          `A buyer has raised a dispute: "${data.reason.replace(/_/g, " ")}". Our team will review it.`,
          order.id
        );
      }
    } catch {}

    return dispute;
  }

  public async getUserDisputes(userId: number) {
    return await this.repository.getUserDisputes(userId);
  }

  public async getDisputeById(userId: number, userRole: string | undefined, disputeId: number) {
    const dispute = await this.repository.getDisputeById(disputeId);
    if (!dispute) throw new NotFoundError("Dispute not found");

    if (userRole !== "admin" && dispute.userId !== userId) {
      throw new ForbiddenError("Access denied");
    }

    return dispute;
  }

  public async getAllDisputes(userRole: string | undefined) {
    if (userRole !== "admin") throw new ForbiddenError("Admin access required");
    return await this.repository.getAllDisputes();
  }

  public async reviewDispute(userId: number, userRole: string | undefined, disputeId: number) {
    if (userRole !== "admin") throw new ForbiddenError("Admin access required");

    const dispute = await this.repository.getDisputeById(disputeId);
    if (!dispute) throw new NotFoundError("Dispute not found");

    const updated = await this.repository.updateDisputeStatus(disputeId, "under_review");

    try {
      await this.repository.createNotification(
        dispute.userId,
        "order_update",
        `Dispute #${dispute.id} under review`,
        "Your dispute is now under review by our support team. We'll update you shortly.",
        dispute.orderId
      );
    } catch {}

    return updated;
  }

  public async resolveDispute(userId: number, userRole: string | undefined, disputeId: number, data: any) {
    if (userRole !== "admin") throw new ForbiddenError("Admin access required");

    const dispute = await this.repository.getDisputeById(disputeId);
    if (!dispute) throw new NotFoundError("Dispute not found");
    if (!["open", "under_review"].includes(dispute.status)) {
      throw new AppError("Dispute is already resolved", 409);
    }

    const order = await this.repository.getOrderById(dispute.orderId);
    if (!order) throw new NotFoundError("Associated order not found");

    const updated = await this.repository.updateDisputeStatus(disputeId, data.status, {
      resolution: data.resolution,
      adminNote: data.adminNote,
      resolvedBy: userId,
      resolvedAt: new Date(),
    });

    if (data.processRefund && order.paymentStatus === "in_escrow") {
      await this.repository.markOrderRefunded(order.id);

      const PAYSTACK_SECRET = env.PAYSTACK_SECRET_KEY ?? "";
      let providerName: "paystack" | "manual" = "manual";
      if (PAYSTACK_SECRET && order.paymentReference) {
        try {
          await paymentsService.paystackPost("/refund", {
            transaction: order.paymentReference,
            amount: order.totalPrice,
            currency: "GHS",
            merchant_note: data.resolution ?? "Buyer refund via Nafex Hub dispute resolution",
          });
          providerName = "paystack";
        } catch (err) {
          console.warn("Paystack dispute refund call failed; DB marked refunded for manual handling", err);
        }
      }

      await this.repository.createTransaction({
        orderId: order.id,
        userId: order.userId,
        type: "refund",
        amount: (order.totalPrice / 100).toString(),
        currency: "GHS",
        provider: providerName,
        providerRef: `REFUND-DISPUTE-${dispute.id}-${Date.now()}`,
        status: "success",
        metadata: { disputeId: dispute.id, resolution: data.status },
      });
    } else if (data.releasePayout && order.paymentStatus === "in_escrow") {
      await this.repository.markOrderReleased(order.id);

      const totalPriceGhs = order.totalPrice / 100;
      let commissionRate = 0.05;
      if (totalPriceGhs <= 100) commissionRate = 0.015;
      else if (totalPriceGhs <= 500) commissionRate = 0.03;
      const commissionPesewas = Math.floor(order.totalPrice * commissionRate);
      const payoutAmount = order.totalPrice - commissionPesewas;

      const payoutSuccess = await paymentsService.payoutToSeller(order.businessId, payoutAmount, order.id);

      await this.repository.createTransaction({
        orderId: order.id,
        userId,
        type: "payout",
        amount: (payoutAmount / 100).toString(),
        currency: "GHS",
        provider: "paystack",
        providerRef: `PAYOUT-DISPUTE-${dispute.id}-${Date.now()}`,
        status: payoutSuccess ? "success" : "failed",
        metadata: { disputeId: dispute.id, resolution: data.status, commissionPesewas },
      });
    }

    try {
      const isBuyerWin = data.status === "resolved_buyer";
      await this.repository.createNotification(
        dispute.userId,
        "order_update",
        `Dispute #${dispute.id} resolved`,
        isBuyerWin
          ? `Your dispute has been resolved in your favour. ${data.processRefund ? "A refund will be processed." : ""}`
          : `Your dispute has been reviewed. ${data.resolution}`,
        dispute.orderId
      );

      const biz = await this.repository.getBusinessOwnerId(order.businessId);
      if (biz?.ownerId) {
        await this.repository.createNotification(
          biz.ownerId,
          "order_update",
          `Dispute resolved for Order #${order.id}`,
          data.status === "resolved_seller"
            ? `The dispute for Order #${order.id} has been resolved in your favour.`
            : `The dispute for Order #${order.id} has been resolved. ${data.processRefund ? "The buyer has been refunded." : ""}`,
          dispute.orderId
        );
      }
    } catch {}

    return updated;
  }
}
