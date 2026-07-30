import { Request, Response } from "express";
import { z } from "zod";
import { RidersService } from "./riders.service";
import { ValidationError, ForbiddenError } from "../../shared/errors/AppError";
import type { AuthRequest } from "../../lib/auth-middleware";

const CreateRiderBody = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  vehicleType: z.enum(["bike", "car", "van"]).default("bike"),
  zone: z.string().optional(),
});

const UpdateRiderBody = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  vehicleType: z.enum(["bike", "car", "van"]).optional(),
  zone: z.string().optional(),
  isAvailable: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const RiderParams = z.object({ id: z.coerce.number().int().positive() });

export class RidersController {
  private service: RidersService;

  constructor(service: RidersService) {
    this.service = service;
  }

  private requireAdmin(req: AuthRequest) {
    if (req.userRole !== "admin") {
      throw new ForbiddenError("Admin access required");
    }
  }

  public async getRiders(req: AuthRequest, res: Response): Promise<void> {
    this.requireAdmin(req);
    const riders = await this.service.getRiders();
    res.json(riders);
  }

  public async getAvailableRiders(req: AuthRequest, res: Response): Promise<void> {
    this.requireAdmin(req);
    const riders = await this.service.getAvailableRiders();
    res.json(riders);
  }

  public async createRider(req: AuthRequest, res: Response): Promise<void> {
    this.requireAdmin(req);

    const parsed = CreateRiderBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const rider = await this.service.createRider(parsed.data);
    res.status(201).json(rider);
  }

  public async updateRider(req: AuthRequest, res: Response): Promise<void> {
    this.requireAdmin(req);

    const params = RiderParams.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid rider id");

    const parsed = UpdateRiderBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const rider = await this.service.updateRider(params.data.id, parsed.data);
    res.json(rider);
  }

  public async toggleAvailability(req: AuthRequest, res: Response): Promise<void> {
    this.requireAdmin(req);

    const params = RiderParams.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid rider id");

    const rider = await this.service.toggleAvailability(params.data.id);
    res.json(rider);
  }
}
