import { Request, Response } from "express";
import { z } from "zod";
import { PaymentsService } from "./payments.service";
import { ValidationError } from "../../shared/errors/AppError";
import type { AuthRequest } from "../../lib/auth-middleware";
import { env } from "../../config/env";

const OrderParams = z.object({ orderId: z.coerce.number().int().positive() });

const VerifyPaymentBody = z.object({
  reference: z.string().min(1),
  orderId: z.number().int().positive(),
});

const RefundBody = z.object({
  orderId: z.number().int().positive(),
  reason: z.string().optional(),
});

export class PaymentsController {
  private service: PaymentsService;

  constructor(service: PaymentsService) {
    this.service = service;
  }

  public getPaystackConfig(_req: Request, res: Response): void {
    res.json({ publicKey: env.PAYSTACK_PUBLIC_KEY ?? null });
  }

  public async initializePayment(req: AuthRequest, res: Response): Promise<void> {
    const parsed = z.object({ 
      orderId: z.number().int().positive(),
      milestoneId: z.number().int().positive().optional()
    }).safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const result = await this.service.initializePayment(req.userId!, parsed.data.orderId, parsed.data.milestoneId);
    res.json(result);
  }

  public async verifyPayment(req: AuthRequest, res: Response): Promise<void> {
    const parsed = VerifyPaymentBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const result = await this.service.verifyPayment(req.userId!, parsed.data.orderId, parsed.data.reference);
    res.json(result);
  }

  public async handleWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers["x-paystack-signature"] as string | undefined;
    const rawBody = (req as any).rawBody as Buffer | undefined;
    const bodyToVerify = rawBody ?? JSON.stringify(req.body);

    if (!signature) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    await this.service.handleWebhook(bodyToVerify, signature, req.body);
    res.sendStatus(200);
  }

  public async getUserTransactions(req: AuthRequest, res: Response): Promise<void> {
    const txns = await this.service.getUserTransactions(req.userId!);
    res.json(txns);
  }

  public async getBusinessTransactions(req: AuthRequest, res: Response): Promise<void> {
    const txns = await this.service.getBusinessTransactionsByOwner(req.userId!);
    res.json(txns);
  }

  public async getAllTransactions(req: AuthRequest, res: Response): Promise<void> {
    const txns = await this.service.getAllTransactions(req.userRole);
    res.json(txns);
  }

  public async adminReleasePayout(req: AuthRequest, res: Response): Promise<void> {
    const params = OrderParams.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid order id");

    const updated = await this.service.adminReleasePayout(req.userId!, req.userRole, params.data.orderId);
    res.json(updated);
  }

  public async adminRefundOrder(req: AuthRequest, res: Response): Promise<void> {
    const params = OrderParams.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid order id");

    const parsed = RefundBody.safeParse({ ...req.body, orderId: params.data.orderId });
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const updated = await this.service.adminRefundOrder(req.userId!, req.userRole, params.data.orderId, parsed.data.reason);
    res.json(updated);
  }
}
