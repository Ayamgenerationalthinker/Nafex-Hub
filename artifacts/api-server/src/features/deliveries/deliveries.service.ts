import { DeliveriesRepository } from "./deliveries.repository";
import { ForbiddenError, NotFoundError, AppError } from "../../shared/errors/AppError";

function generateTrackingCode(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `NAF-${date}-${rand}`;
}

export function calculateDeliveryFee(zone: string | undefined): number {
  const fees: Record<string, number> = {
    accra_central: 15,
    accra_east:    20,
    accra_west:    20,
    tema:          25,
    kumasi:        50,
    takoradi:      60,
    tamale:        80,
    default:       30,
  };
  return fees[zone?.toLowerCase() ?? "default"] ?? fees["default"]!;
}

export class DeliveriesService {
  private repository: DeliveriesRepository;

  constructor(repository: DeliveriesRepository) {
    this.repository = repository;
  }

  public async createDelivery(userId: number, userRole: string | undefined, data: any) {
    const { order, business } = await this.repository.getOrderAndBusiness(data.orderId);
    if (!order) throw new NotFoundError("Order not found");

    if (userRole !== "admin") {
      if (!business || business.ownerId !== userId) {
        throw new ForbiddenError("Only the seller or admin can create a delivery");
      }
    }

    const existing = await this.repository.getDeliveryByOrderId(data.orderId);
    if (existing) throw new AppError("Delivery already exists for this order", 409);

    const fee = calculateDeliveryFee(data.deliveryZone);
    const trackingCode = generateTrackingCode();

    const delivery = await this.repository.createDelivery({
      orderId: data.orderId,
      trackingCode,
      pickupAddress: data.pickupAddress,
      deliveryAddress: data.deliveryAddress,
      deliveryZone: data.deliveryZone,
      deliveryFee: fee.toString(),
      notes: data.notes,
      estimatedArrival: data.estimatedArrival ? new Date(data.estimatedArrival) : undefined,
      status: "created",
    });

    await this.repository.createDeliveryEvent(delivery.id, "created", "Delivery created and awaiting rider assignment");

    try {
      await this.repository.createNotification(
        order.userId,
        "order_update",
        `Delivery created for Order #${order.id}`,
        `Your tracking code is ${trackingCode}. You can track your order in real-time.`,
        order.id
      );
    } catch {}

    return await this.repository.enrichDelivery(delivery);
  }

  public async trackDelivery(code: string) {
    const delivery = await this.repository.getDeliveryByTrackingCode(code);
    if (!delivery) throw new NotFoundError("Tracking code not found");

    const { order, business } = await this.repository.getOrderAndBusiness(delivery.orderId);

    const enriched = await this.repository.enrichDelivery(delivery);
    return { ...enriched, businessName: business?.name ?? null };
  }

  public async getDeliveryByOrderId(orderId: number) {
    const delivery = await this.repository.getDeliveryByOrderId(orderId);
    if (!delivery) throw new NotFoundError("No delivery found for this order");

    return await this.repository.enrichDelivery(delivery);
  }

  public async getDeliveryById(id: number) {
    const delivery = await this.repository.getDeliveryById(id);
    if (!delivery) throw new NotFoundError("Delivery not found");

    return await this.repository.enrichDelivery(delivery);
  }

  public async updateStatus(userRole: string | undefined, id: number, data: any) {
    if (userRole !== "admin") {
      throw new ForbiddenError("Admin access required to update delivery status");
    }

    const delivery = await this.repository.getDeliveryById(id);
    if (!delivery) throw new NotFoundError("Delivery not found");

    const updated = await this.repository.updateDelivery(id, { status: data.status });
    await this.repository.createDeliveryEvent(id, data.status, data.note, data.location);

    try {
      const { order } = await this.repository.getOrderAndBusiness(delivery.orderId);
      if (order) {
        const labels: Record<string, string> = {
          picked_up:  "picked up by the rider",
          in_transit: "on its way to you",
          delivered:  "delivered successfully",
          failed:     "delivery failed — our team will follow up",
          returned:   "returned to sender",
        };
        const label = labels[data.status];
        if (label) {
          await this.repository.createNotification(
            order.userId,
            "order_update",
            `Delivery update for Order #${order.id}`,
            `Your package is ${label}. Tracking: ${delivery.trackingCode}`,
            order.id
          );
        }
      }
    } catch {}

    return await this.repository.enrichDelivery(updated);
  }

  public async assignRider(userRole: string | undefined, id: number, riderId: number) {
    if (userRole !== "admin") {
      throw new ForbiddenError("Admin access required");
    }

    const delivery = await this.repository.getDeliveryById(id);
    if (!delivery) throw new NotFoundError("Delivery not found");

    const rider = await this.repository.getRider(riderId);
    if (!rider || !rider.isActive) throw new NotFoundError("Rider not found or inactive");

    const updated = await this.repository.updateDelivery(id, { riderId, status: "assigned" });
    
    await this.repository.createDeliveryEvent(id, "assigned", `Assigned to ${rider.name} (${rider.phone})`);
    await this.repository.setRiderAvailability(riderId, false);

    return await this.repository.enrichDelivery(updated);
  }

  public async getAllDeliveries(userRole: string | undefined) {
    if (userRole !== "admin") throw new ForbiddenError("Admin access required");
    
    const deliveries = await this.repository.getAllDeliveries();
    return await Promise.all(deliveries.map(d => this.repository.enrichDelivery(d)));
  }
}
