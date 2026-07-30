import { Request, Response } from "express";
import { z } from "zod";
import { OrdersService } from "./orders.service";
import { ValidationError } from "../../shared/errors/AppError";
import type { AuthRequest } from "../../lib/auth-middleware";

const OrderItemSchema = z.object({
  name: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().int().nonnegative(),
});

const CreateOrderBody = z.object({
  businessId: z.number().int().positive(),
  items: z.array(OrderItemSchema).min(1),
  totalPrice: z.number().int().nonnegative(),
  coinsApplied: z.number().int().nonnegative().optional().default(0),
  isB2b: z.boolean().optional().default(false),
  notes: z.string().optional(),
});

const OrderParams = z.object({ id: z.coerce.number().int().positive() });

const UpdateStatusBody = z.object({
  status: z.enum(["pending", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled"]),
});

const PayBody = z.object({ reference: z.string().min(1).max(100) });
const ConfirmDeliveryBody = z.object({ otp: z.string().length(6) });
const MilestonePayBody = z.object({
  milestoneId: z.number().int().positive(),
  reference: z.string().min(1),
});

const AdminUpdateBody = z.object({
  status: z.enum(["pending", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled"]),
  paymentStatus: z.enum(["unpaid", "partial", "in_escrow", "released", "refunded"]),
});

export class OrdersController {
  private service: OrdersService;

  constructor(service: OrdersService) {
    this.service = service;
  }

  public async createOrder(req: AuthRequest, res: Response): Promise<void> {
    const parsed = CreateOrderBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const order = await this.service.createOrder(req.userId!, parsed.data);
    res.status(201).json(order);
  }

  public async payOrder(req: AuthRequest, res: Response): Promise<void> {
    const params = OrderParams.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid order id");

    const parsed = PayBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("reference is required");

    const order = await this.service.processPayment(req.userId!, params.data.id, parsed.data.reference);
    res.json(order);
  }

  public async getUserOrders(req: AuthRequest, res: Response): Promise<void> {
    const orders = await this.service.getOrdersByUser(req.userId!);
    res.json(orders);
  }

  public async getBusinessOrders(req: AuthRequest, res: Response): Promise<void> {
    const orders = await this.service.getOrdersByBusinessOwner(req.userId!);
    res.json(orders);
  }

  public async updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
    const params = OrderParams.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error.message);

    const parsed = UpdateStatusBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const order = await this.service.updateOrderStatus(req.userId!, params.data.id, parsed.data.status);
    res.json(order);
  }

  public async confirmDelivery(req: AuthRequest, res: Response): Promise<void> {
    const params = OrderParams.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid order id");

    const parsed = ConfirmDeliveryBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("A 6-digit OTP is required");

    const order = await this.service.confirmDelivery(req.userId!, params.data.id, parsed.data.otp);
    res.json(order);
  }

  public async getOrderById(req: AuthRequest, res: Response): Promise<void> {
    const params = OrderParams.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid order id");

    const order = await this.service.getOrderById(req.userId!, req.userRole, params.data.id);
    res.json(order);
  }

  public async payMilestone(req: AuthRequest, res: Response): Promise<void> {
    const params = OrderParams.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid order id");

    const parsed = MilestonePayBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const order = await this.service.processMilestonePayment(req.userId!, params.data.id, parsed.data.milestoneId, parsed.data.reference);
    res.json(order);
  }

  public async getAllOrders(req: AuthRequest, res: Response): Promise<void> {
    const page = Math.max(1, Number(req.query.page) || 1);
    const result = await this.service.getAllOrders(req.userRole, page);
    res.json(result);
  }

  public async adminOverrideOrder(req: AuthRequest, res: Response): Promise<void> {
    const params = OrderParams.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid id");

    const parsed = AdminUpdateBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const order = await this.service.overrideOrderStatus(req.userRole, params.data.id, parsed.data.status, parsed.data.paymentStatus);
    res.json(order);
  }
}
