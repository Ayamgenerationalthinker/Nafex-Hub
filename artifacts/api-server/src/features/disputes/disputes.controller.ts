import { Request, Response } from "express";
import { z } from "zod";
import { DisputesService } from "./disputes.service";
import { ValidationError } from "../../shared/errors/AppError";
import type { AuthRequest } from "../../lib/auth-middleware";

const CreateDisputeBody = z.object({
  orderId: z.number().int().positive(),
  reason: z.enum([
    "item_not_received",
    "item_not_as_described",
    "damaged_item",
    "wrong_item",
    "seller_unresponsive",
    "other",
  ]),
  description: z.string().min(10, "Please describe the issue in at least 10 characters"),
  evidenceUrls: z.array(z.string().url()).default([]),
});

const ResolveDisputeBody = z.object({
  status: z.enum(["resolved_buyer", "resolved_seller", "dismissed"]),
  resolution: z.string().min(1, "Resolution note is required"),
  adminNote: z.string().optional(),
  processRefund: z.boolean().default(false),
  releasePayout: z.boolean().default(false),
});

const DisputeParams = z.object({ id: z.coerce.number().int().positive() });

export class DisputesController {
  private service: DisputesService;

  constructor(service: DisputesService) {
    this.service = service;
  }

  public async raiseDispute(req: AuthRequest, res: Response): Promise<void> {
    const parsed = CreateDisputeBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const dispute = await this.service.raiseDispute(req.userId!, parsed.data);
    res.status(201).json(dispute);
  }

  public async getUserDisputes(req: AuthRequest, res: Response): Promise<void> {
    const disputes = await this.service.getUserDisputes(req.userId!);
    res.json(disputes);
  }

  public async getDisputeById(req: AuthRequest, res: Response): Promise<void> {
    const params = DisputeParams.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid dispute id");

    const dispute = await this.service.getDisputeById(req.userId!, req.userRole, params.data.id);
    res.json(dispute);
  }

  public async getAllDisputes(req: AuthRequest, res: Response): Promise<void> {
    const disputes = await this.service.getAllDisputes(req.userRole);
    res.json(disputes);
  }

  public async reviewDispute(req: AuthRequest, res: Response): Promise<void> {
    const params = DisputeParams.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid dispute id");

    const updated = await this.service.reviewDispute(req.userId!, req.userRole, params.data.id);
    res.json(updated);
  }

  public async resolveDispute(req: AuthRequest, res: Response): Promise<void> {
    const params = DisputeParams.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid dispute id");

    const parsed = ResolveDisputeBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const updated = await this.service.resolveDispute(req.userId!, req.userRole, params.data.id, parsed.data);
    res.json(updated);
  }
}
