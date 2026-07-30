import { Request, Response } from "express";
import { z } from "zod";
import { MessagesService } from "./messages.service";
import { ValidationError } from "../../shared/errors/AppError";
import type { AuthRequest } from "../../lib/auth-middleware";

const CreateConversationBody = z.object({
  businessId: z.number().int().positive(),
});

const ConversationParams = z.object({
  id: z.coerce.number().int().positive(),
});

const SendMessageBody = z.object({
  text: z.string().min(1).max(2000),
  attachmentUrl: z.string().optional(),
  attachmentType: z.enum(['image', 'pdf', 'voice', 'product', 'order']).optional(),
  referenceId: z.number().int().positive().optional(),
});

export class MessagesController {
  private service: MessagesService;

  constructor(service: MessagesService) {
    this.service = service;
  }

  public async getBuyerConversations(req: AuthRequest, res: Response): Promise<void> {
    const conversations = await this.service.getBuyerConversations(req.userId!);
    res.json(conversations);
  }

  public async getSellerConversations(req: AuthRequest, res: Response): Promise<void> {
    const conversations = await this.service.getSellerConversations(req.userId!);
    res.json(conversations);
  }

  public async getAdminConversations(req: AuthRequest, res: Response): Promise<void> {
    const conversations = await this.service.getAdminConversations(req.userRole);
    res.json(conversations);
  }

  public async createConversation(req: AuthRequest, res: Response): Promise<void> {
    const parsed = CreateConversationBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const conv = await this.service.createOrGetConversation(req.userId!, parsed.data.businessId);
    res.json(conv);
  }

  public async markMessagesAsRead(req: AuthRequest, res: Response): Promise<void> {
    const params = ConversationParams.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error.message);

    const result = await this.service.markMessagesAsRead(req.userId!, req.userRole, params.data.id);
    res.json(result);
  }

  public async getMessages(req: AuthRequest, res: Response): Promise<void> {
    const params = ConversationParams.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error.message);

    const messages = await this.service.getMessages(req.userId!, req.userRole, params.data.id);
    res.json(messages);
  }

  public async sendMessage(req: AuthRequest, res: Response): Promise<void> {
    const params = ConversationParams.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error.message);

    const parsed = SendMessageBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const message = await this.service.sendMessage(req.userId!, req.userRole, params.data.id, parsed.data);
    res.status(201).json(message);
  }

  public async setAdminStatus(req: AuthRequest, res: Response): Promise<void> {
    const params = ConversationParams.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid id");

    const parsed = z.object({ status: z.enum(["monitoring", "intervened", "resolved"]) }).safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Invalid status");

    const updated = await this.service.setAdminStatus(req.userRole, params.data.id, parsed.data.status);
    res.json(updated);
  }
}
