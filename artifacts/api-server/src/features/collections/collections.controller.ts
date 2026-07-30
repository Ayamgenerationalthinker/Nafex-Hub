import { Request, Response } from "express";
import { z } from "zod";
import { CollectionsService } from "./collections.service";
import { ValidationError } from "../../shared/errors/AppError";
import type { AuthRequest } from "../../lib/auth-middleware";

const IdParam = z.object({ id: z.coerce.number().int().positive() });

const CreateBody = z.object({
  businessId: z.coerce.number().int().positive(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  coverImage: z.string().url().optional().or(z.literal("")),
});

const UpdateBody = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  coverImage: z.string().url().nullable().optional().or(z.literal("").transform(() => null)),
});

export class CollectionsController {
  private service: CollectionsService;

  constructor(service: CollectionsService) {
    this.service = service;
  }

  public async getCollections(req: Request, res: Response): Promise<void> {
    const parsed = z.coerce.number().int().positive().safeParse(req.query.businessId);
    if (!parsed.success) {
      throw new ValidationError("businessId query param required");
    }

    const collections = await this.service.getCollectionsForBusiness(parsed.data);
    res.json(collections);
  }

  public async createCollection(req: AuthRequest, res: Response): Promise<void> {
    const parsed = CreateBody.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    const col = await this.service.createCollection(req.userId!, parsed.data);
    res.status(201).json(col);
  }

  public async updateCollection(req: AuthRequest, res: Response): Promise<void> {
    const params = IdParam.safeParse(req.params);
    if (!params.success) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const parsed = UpdateBody.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    const updateData = {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(parsed.data.coverImage !== undefined && { coverImage: parsed.data.coverImage }),
    };

    const updated = await this.service.updateCollection(req.userId!, params.data.id, updateData);
    res.json(updated);
  }

  public async deleteCollection(req: AuthRequest, res: Response): Promise<void> {
    const params = IdParam.safeParse(req.params);
    if (!params.success) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await this.service.deleteCollection(req.userId!, params.data.id);
    res.json({ ok: true });
  }
}
