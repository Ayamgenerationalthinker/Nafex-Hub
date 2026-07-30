import { Request, Response } from "express";
import { z } from "zod";
import { DeliveriesService, calculateDeliveryFee } from "./deliveries.service";
import { ValidationError } from "../../shared/errors/AppError";
import type { AuthRequest } from "../../lib/auth-middleware";

const CreateDeliveryBody = z.object({
  orderId: z.number().int().positive(),
  pickupAddress: z.string().min(1),
  deliveryAddress: z.string().min(1),
  deliveryZone: z.string().optional(),
  notes: z.string().optional(),
  estimatedArrival: z.string().datetime().optional(),
});

const UpdateStatusBody = z.object({
  status: z.enum(["assigned", "picked_up", "in_transit", "delivered", "failed", "returned"]),
  note: z.string().optional(),
  location: z.string().optional(),
});

const AssignRiderBody = z.object({ riderId: z.number().int().positive() });

const DeliveryParams = z.object({ id: z.coerce.number().int().positive() });
const TrackingParams = z.object({ code: z.string().min(1) });
const OrderParams = z.object({ orderId: z.coerce.number().int().positive() });

export class DeliveriesController {
  private service: DeliveriesService;

  constructor(service: DeliveriesService) {
    this.service = service;
  }

  public async createDelivery(req: AuthRequest, res: Response): Promise<void> {
    const parsed = CreateDeliveryBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const delivery = await this.service.createDelivery(req.userId!, req.userRole, parsed.data);
    res.status(201).json(delivery);
  }

  public async trackDelivery(req: Request, res: Response): Promise<void> {
    const params = TrackingParams.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid tracking code");

    const delivery = await this.service.trackDelivery(params.data.code);
    res.json(delivery);
  }

  public async getDeliveryByOrderId(req: AuthRequest, res: Response): Promise<void> {
    const params = OrderParams.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid order id");

    const delivery = await this.service.getDeliveryByOrderId(params.data.orderId);
    res.json(delivery);
  }

  public async getFeeEstimate(req: Request, res: Response): Promise<void> {
    const zone = (req.query["zone"] as string | undefined);
    const fee = calculateDeliveryFee(zone);
    res.json({ zone: zone ?? "default", fee, currency: "GHS" });
  }

  public async getDeliveryById(req: AuthRequest, res: Response): Promise<void> {
    const params = DeliveryParams.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid delivery id");

    const delivery = await this.service.getDeliveryById(params.data.id);
    res.json(delivery);
  }

  public async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    const params = DeliveryParams.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid delivery id");

    const parsed = UpdateStatusBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const delivery = await this.service.updateStatus(req.userRole, params.data.id, parsed.data);
    res.json(delivery);
  }

  public async assignRider(req: AuthRequest, res: Response): Promise<void> {
    const params = DeliveryParams.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid delivery id");

    const parsed = AssignRiderBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const delivery = await this.service.assignRider(req.userRole, params.data.id, parsed.data.riderId);
    res.json(delivery);
  }

  public async getAllDeliveries(req: AuthRequest, res: Response): Promise<void> {
    const deliveries = await this.service.getAllDeliveries(req.userRole);
    res.json(deliveries);
  }
}
