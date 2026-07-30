import { Request, Response } from "express";
import { z } from "zod";
import { SupportService } from "./support.service";
import { ValidationError } from "../../shared/errors/AppError";
import type { AuthRequest } from "../../lib/auth-middleware";

const IdParam = z.object({ id: z.coerce.number().int().positive() });

const CreateTicketBody = z.object({
  subject: z.string().min(1).max(255),
  category: z.enum(["Payments", "Orders", "Delivery", "Refund", "Seller Issue", "Buyer Issue", "Verification", "Technical", "general"]).default("general"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  initialMessage: z.string().min(1),
  attachmentUrl: z.string().optional(),
});

export class SupportController {
  private service: SupportService;

  constructor(service: SupportService) {
    this.service = service;
  }

  public async createTicket(req: AuthRequest, res: Response): Promise<void> {
    const parsed = CreateTicketBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid input");

    const result = await this.service.createTicket(req.userId!, parsed.data);
    res.status(201).json(result);
  }

  public async getTickets(req: AuthRequest, res: Response): Promise<void> {
    const convos = await this.service.getTickets(req.userId!, req.userRole);
    res.json(convos);
  }

  public async getTicketMessages(req: AuthRequest, res: Response): Promise<void> {
    const params = IdParam.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid id");

    const messages = await this.service.getTicketMessages(req.userId!, req.userRole, params.data.id);
    res.json(messages);
  }

  public async addTicketMessage(req: AuthRequest, res: Response): Promise<void> {
    const params = IdParam.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid id");

    const parsed = z.object({ 
      text: z.string().min(1).max(2000),
      attachmentUrl: z.string().optional(),
      isInternalNote: z.boolean().default(false),
    }).safeParse(req.body);
    
    if (!parsed.success) throw new ValidationError("Invalid input");

    const msg = await this.service.addTicketMessage(req.userId!, req.userRole, params.data.id, parsed.data);
    res.status(201).json(msg);
  }

  public async updateTicketStatus(req: AuthRequest, res: Response): Promise<void> {
    const params = IdParam.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid id");
    
    const parsed = z.object({
      status: z.enum(["open", "in_progress", "resolved", "closed"]),
      assignedAdminId: z.number().int().positive().optional().nullable()
    }).safeParse(req.body);

    if (!parsed.success) throw new ValidationError("Invalid status");

    const updated = await this.service.updateTicketStatus(req.userId!, req.userRole, params.data.id, parsed.data);
    res.json(updated);
  }

  // Live Support
  public async getOrCreateLiveSupport(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.service.getOrCreateLiveSupport(req.userId!);
    res.json(result);
  }

  public async getUserLiveSupportMessages(req: AuthRequest, res: Response): Promise<void> {
    const result = await this.service.getUserLiveSupportMessages(req.userId!);
    res.json(result);
  }

  public async getAllLiveSupportConversations(req: AuthRequest, res: Response): Promise<void> {
    const convos = await this.service.getAllLiveSupportConversations(req.userRole);
    res.json(convos);
  }

  public async getAdminLiveSupportMessages(req: AuthRequest, res: Response): Promise<void> {
    const params = IdParam.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid id");

    const messages = await this.service.getAdminLiveSupportMessages(req.userRole, params.data.id);
    res.json(messages);
  }

  public async adminReplyLiveSupport(req: AuthRequest, res: Response): Promise<void> {
    const params = IdParam.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid id");

    const parsed = z.object({
      text: z.string().min(1).max(2000),
    }).safeParse(req.body);

    if (!parsed.success) throw new ValidationError("Invalid input");

    const msg = await this.service.adminReplyLiveSupport(req.userId!, req.userRole, params.data.id, parsed.data);
    res.status(201).json(msg);
  }

  public async closeLiveSupport(req: AuthRequest, res: Response): Promise<void> {
    const params = IdParam.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid id");

    const result = await this.service.closeLiveSupport(req.userId!, req.userRole, params.data.id);
    res.json(result);
  }
}
