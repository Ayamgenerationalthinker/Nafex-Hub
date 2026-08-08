import { OrdersRepository } from "./orders.repository";
import { ForbiddenError, NotFoundError, AppError } from "../../shared/errors/AppError";
import { sendAdminEmail, sendDeliveryOtpEmail } from "../../lib/mailer";
import { paymentsService } from "../payments/payments.routes";
import crypto from "crypto";
import { notificationQueue } from "../../lib/queue";
import { notifySeller } from "../../lib/notify";

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export class OrdersService {
  private repository: OrdersRepository;

  constructor(repository: OrdersRepository) {
    this.repository = repository;
  }

  private notifyAllAdmins(type: "message" | "order_update" | "review", title: string, body: string, relatedId: number) {
    this.repository.getAdmins().then(admins => {
      if (notificationQueue) {
        // BullMQ bulk addition for fault tolerance
        notificationQueue.addBulk(
          admins.map(admin => ({
            name: "notification",
            data: { userId: admin.id, type, title, body, relatedId }
          }))
        ).catch(() => {});
      } else {
        // Fallback for local dev without Redis
        Promise.allSettled(admins.map(admin => 
          this.repository.createNotification(admin.id, type, title, body, relatedId)
        )).catch(() => {});
      }
    }).catch(() => {});
  }

  public async createOrder(userId: number, data: any) {
    const business = await this.repository.getBusiness(data.businessId);
    if (!business) throw new NotFoundError("Business not found");

    // Idempotency check: Prevent duplicate identical orders within the last 5 seconds
    const recentOrder = await this.repository.getRecentIdenticalOrder(userId, data.businessId, data.totalPrice, 5);
    if (recentOrder) {
      throw new AppError("A duplicate order was recently created. Please check your orders or wait a moment.", 409);
    }

    let milestones: any[] = [];
    if (data.isB2b) {
      const half = Math.floor(data.totalPrice / 2);
      const remainder = data.totalPrice - half;
      milestones = [
        { id: 1, description: "50% Upfront Deposit", amount: half, status: "pending" },
        { id: 2, description: "50% Balance on Delivery", amount: remainder, status: "pending" }
      ];
    }

    const order = await this.repository.transaction(async (tx) => {
      if (data.coinsApplied > 0) {
        const user = await this.repository.getUser(userId);
        if (!user || user.loyaltyPoints < data.coinsApplied) {
          throw new AppError("Not enough Nafex Coins", 400);
        }
        await this.repository.deductUserCoins(userId, data.coinsApplied, tx);
      }

      const newOrder = await this.repository.createOrder({
        userId,
        businessId: data.businessId,
        items: data.items,
        totalPrice: data.totalPrice,
        coinsApplied: data.coinsApplied,
        isB2b: data.isB2b,
        milestones,
        notes: data.notes,
        status: "pending",
        paymentStatus: "unpaid",
      }, tx);

      const lowStockProducts: any[] = [];
      // Deduct inventory atomically to prevent overselling
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          if (item.productId && item.quantity) {
            try {
              const updatedProduct = await this.repository.deductInventory(item.productId, item.quantity, tx);
              if (updatedProduct && updatedProduct.stock !== null && updatedProduct.stock <= 5) {
                lowStockProducts.push(updatedProduct);
              }
            } catch (err: any) {
              throw new AppError(err.message || "Insufficient stock", 400);
            }
          }
        }
      }

      return { order: newOrder, lowStockProducts };
    });

    // Notify seller of low stock levels after transaction succeeds
    if (business.ownerId && order.lowStockProducts.length > 0) {
      for (const prod of order.lowStockProducts) {
        notifySeller(business.ownerId, {
          type: "low_stock",
          title: "Low stock alert",
          body: `Product "${prod.name}" has only ${prod.stock} items remaining in stock.`,
          metadata: { productId: prod.id, stock: prod.stock },
          relatedId: prod.id,
        }).catch(() => {});
      }
    }

    const newOrder = order.order;

    sendAdminEmail(
      "New Order Placed",
      `A new order has been placed on Nafex Hub.\n\nOrder ID: ${newOrder.id}\nBusiness ID: ${newOrder.businessId}\nTotal: GHS ${(newOrder.totalPrice / 100).toFixed(2)}\nItems: ${data.items.length}\nDate: ${new Date().toUTCString()}`
    );

    // Notify seller of new order
    if (business.ownerId) {
      notifySeller(business.ownerId, {
        type: "new_order",
        title: `New order received — #${newOrder.id}`,
        body: `You received a new order for GHS ${((data.totalPrice ?? 0) / 100).toFixed(2)} (${(data.items?.length ?? 0)} item${(data.items?.length ?? 0) === 1 ? "" : "s"}). Awaiting buyer payment.`,
        metadata: { orderId: newOrder.id, totalPrice: data.totalPrice, itemCount: data.items?.length },
        relatedId: newOrder.id,
      });
    }

    try {
      const totalGhs = `GHS ${(newOrder.totalPrice / 100).toFixed(2)}`;
      await this.notifyAllAdmins(
        "order_update",
        `New order placed — #${newOrder.id}`,
        `${business.name ?? "A business"} received a new order for ${totalGhs}. Track payment & delivery in the admin dashboard.`,
        newOrder.id
      );
    } catch {}

    return newOrder;
  }

  public async processPayment(userId: number, orderId: number, reference: string) {
    const existing = await this.repository.getOrderById(orderId);
    if (!existing) throw new NotFoundError("Order not found");
    if (existing.userId !== userId) throw new ForbiddenError("Not your order");
    if (existing.paymentStatus !== "unpaid") throw new AppError("Payment already recorded", 409);

    const updated = await this.repository.updateOrder(orderId, {
      paymentStatus: "in_escrow",
      paymentReference: reference,
      updatedAt: new Date(),
    });

    // Notify seller of confirmed payment into escrow
    try {
      const business = await this.repository.getBusiness(existing.businessId);
      if (business && business.ownerId) {
        notifySeller(business.ownerId, {
          type: "payment_received",
          title: `Payment received for Order #${existing.id}`,
          body: `The buyer submitted payment for Order #${existing.id}. Funds are now held in escrow.`,
          metadata: { orderId: existing.id, reference },
          relatedId: existing.id,
        });
      }
      await this.notifyAllAdmins(
        "order_update",
        `Payment received — Order #${existing.id}`,
        `${business?.name ?? "A seller"} received an escrow-held payment for Order #${existing.id} (ref: ${reference}). Ready for fulfillment.`,
        existing.id
      );
    } catch {}

    return updated;
  }

  public async getOrdersByUser(userId: number) {
    return await this.repository.getOrdersByUser(userId);
  }

  public async getOrdersByBusinessOwner(ownerId: number) {
    return await this.repository.getOrdersByBusinessOwner(ownerId);
  }

  public async updateOrderStatus(userId: number, orderId: number, status: string) {
    const existing = await this.repository.getOrderById(orderId);
    if (!existing) throw new NotFoundError("Order not found");

    const business = await this.repository.getBusiness(existing.businessId);
    if (!business || business.ownerId !== userId) {
      throw new ForbiddenError("Not your order");
    }

    const updateFields: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === "out_for_delivery") {
      updateFields.deliveryOtp = generateOtp();
      updateFields.deliveryOtpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    }

    if (status === "cancelled" && existing.status !== "cancelled" && existing.coinsApplied > 0) {
      await this.repository.addUserCoins(existing.userId, existing.coinsApplied);
    }

    const order = await this.repository.updateOrder(orderId, updateFields);

    if (status === "out_for_delivery" && updateFields.deliveryOtp) {
      try {
        const buyer = await this.repository.getUser(order.userId);
        if (buyer?.email) {
          sendDeliveryOtpEmail(buyer.email, buyer.name ?? "Customer", order.id, updateFields.deliveryOtp).catch(() => {});
        }
      } catch {}
    }

    try {
      const statusLabels: Record<string, string> = {
        confirmed: "confirmed",
        packed: "packed and ready",
        out_for_delivery: "out for delivery",
        delivered: "delivered",
        cancelled: "cancelled",
      };
      const label = statusLabels[status] ?? status;
      let body = `Your order status has been updated to "${label}".`;
      if (status === "out_for_delivery" && updateFields.deliveryOtp) {
        body = `Your order is out for delivery! Your delivery OTP is: ${updateFields.deliveryOtp}. Share this code with your delivery person to confirm receipt.`;
      }

      // Notify buyer of status change (existing behavior)
      const notif = await this.repository.createNotification(
        order.userId,
        "order_update",
        `Order #${order.id} is ${label}`,
        body,
        order.id
      );
      import("../../lib/socket").then(({ getIO }) => {
        getIO()?.to(`user_${order.userId}`).emit("new_notification", notif);
      });

      // Notify seller if order was cancelled by someone else (edge case: admin override)
      if (status === "cancelled") {
        const biz = await this.repository.getBusiness(order.businessId);
        if (biz?.ownerId) {
          notifySeller(biz.ownerId, {
            type: "order_cancelled",
            title: `Order #${order.id} was cancelled`,
            body: `Order #${order.id} has been cancelled.`,
            metadata: { orderId: order.id },
            relatedId: order.id,
          });
        }
      }

      await this.notifyAllAdmins(
        "order_update",
        `Order #${order.id} → ${label}`,
        `Seller updated Order #${order.id} status to "${label}".`,
        order.id
      );
    } catch {}

    return order;
  }

  public async confirmDelivery(userId: number, orderId: number, otp: string) {
    const existing = await this.repository.getOrderById(orderId);
    if (!existing) throw new NotFoundError("Order not found");

    const business = await this.repository.getBusiness(existing.businessId);
    if (!business || business.ownerId !== userId) {
      throw new ForbiddenError("Not your order");
    }

    if (existing.status !== "out_for_delivery") throw new AppError("Order is not out for delivery", 409);
    if (!existing.deliveryOtp || existing.deliveryOtp !== otp) throw new AppError("Invalid OTP", 400);
    if (existing.deliveryOtpExpiry && existing.deliveryOtpExpiry < new Date()) {
      throw new AppError("OTP has expired. Please regenerate by re-dispatching the order.", 400);
    }

    const order = await this.repository.updateOrder(orderId, {
      status: "delivered",
      paymentStatus: existing.paymentStatus === "in_escrow" ? "released" : existing.paymentStatus,
      deliveryOtp: null,
      deliveryOtpExpiry: null,
      updatedAt: new Date(),
    });

    if (existing.paymentStatus === "in_escrow") {
      const points = Math.floor(existing.totalPrice / 2000);
      if (points > 0) {
        await this.repository.addUserCoins(existing.userId, points);
      }

      const totalPriceGhs = existing.totalPrice / 100;
      let commissionRate = 0.05;
      if (totalPriceGhs <= 100) commissionRate = 0.015;
      else if (totalPriceGhs <= 500) commissionRate = 0.03;
      
      const commissionPesewas = Math.floor(existing.totalPrice * commissionRate);
      const payoutAmount = existing.totalPrice - commissionPesewas;

      if (business.paystackRecipientCode) {
        paymentsService.payoutToSeller(business.id, payoutAmount, order.id).catch((err) => {
          import("../../shared/logger").then(({ logger }) => logger.error({ err }, `Automated payout failed for Order #${order.id}`));
        });
      }
    }

    // Notify seller that delivery has been confirmed and payment released
    notifySeller(business.ownerId!, {
      type: "delivery_confirmed",
      title: `Delivery confirmed for Order #${orderId}`,
      body: `The buyer has confirmed receipt of Order #${orderId}. Payment will be released to your account shortly.`,
      metadata: { orderId },
      relatedId: orderId,
    });

    return order;
  }

  public async getOrderById(userId: number, userRole: string | undefined, orderId: number) {
    const order = await this.repository.getOrderById(orderId);
    if (!order) throw new NotFoundError("Order not found");

    if (userRole !== "admin" && order.userId !== userId) {
      const business = await this.repository.getBusiness(order.businessId);
      if (!business || business.ownerId !== userId) {
        throw new ForbiddenError("Not your order");
      }
    }

    return order;
  }

  public async processMilestonePayment(userId: number, orderId: number, milestoneId: number, reference: string) {
    const existing = await this.repository.getOrderById(orderId);
    if (!existing) throw new NotFoundError("Order not found");
    if (existing.userId !== userId) throw new ForbiddenError("Not your order");
    if (!existing.isB2b || !existing.milestones) throw new AppError("Not a milestone-based order", 400);

    const milestones = existing.milestones as any[];
    const msIndex = milestones.findIndex((m: any) => m.id === milestoneId);
    if (msIndex === -1) throw new NotFoundError("Milestone not found");
    if (milestones[msIndex].status !== "pending") throw new AppError("Milestone already paid", 409);

    milestones[msIndex].status = "paid";
    milestones[msIndex].reference = reference;
    milestones[msIndex].paidAt = new Date().toISOString();

    const allPaid = milestones.every((m: any) => m.status === "paid");
    
    const updated = await this.repository.updateOrder(orderId, {
      milestones,
      paymentStatus: allPaid ? "in_escrow" : "partial",
      updatedAt: new Date(),
    });

    // Notify seller of milestone payment received
    try {
      const business = await this.repository.getBusiness(existing.businessId);
      if (business && business.ownerId) {
        notifySeller(business.ownerId, {
          type: "payment_received",
          title: `Milestone payment received for Order #${existing.id}`,
          body: `The buyer has paid milestone: ${milestones[msIndex].description}.`,
          metadata: { orderId: existing.id, milestoneId, description: milestones[msIndex].description },
          relatedId: existing.id,
        });
      }
    } catch {}

    return updated;
  }

  public async getAllOrders(userRole: string | undefined, page: number) {
    if (userRole !== "admin") throw new ForbiddenError("Admin access required");
    return await this.repository.getAllOrders(page);
  }

  public async overrideOrderStatus(userRole: string | undefined, orderId: number, status: string, paymentStatus: string) {
    if (userRole !== "admin") throw new ForbiddenError("Admin access required");
    
    const existing = await this.repository.getOrderById(orderId);
    if (!existing) throw new NotFoundError("Order not found");

    return await this.repository.updateOrder(orderId, { status: status as any, paymentStatus: paymentStatus as any, updatedAt: new Date() });
  }
}
