import { Request, Response } from "express";
import { z } from "zod";
import { BusinessesService } from "./businesses.service";
import { ValidationError } from "../../shared/errors/AppError";
import type { AuthRequest } from "../../lib/auth-middleware";
import {
  CreateBusinessBody,
  UpdateBusinessBody,
  GetBusinessParams,
  UpdateBusinessParams,
  DeleteBusinessParams,
  GetBusinessesQueryParams,
  VerifyBusinessBody,
  VerifyBusinessParams,
} from "@workspace/api-zod";

const SettlementBody = z.object({
  type: z.enum(["momo", "nuban"]),
  name: z.string().min(1),
  account_number: z.string().min(1),
  bank_code: z.string().min(1),
});

export class BusinessesController {
  private service: BusinessesService;

  constructor(service: BusinessesService) {
    this.service = service;
  }

  public async getBusinesses(req: Request, res: Response): Promise<void> {
    const query = GetBusinessesQueryParams.safeParse(req.query);
    if (!query.success) throw new ValidationError(query.error.message);

    const { search, category, verified } = query.data;
    const businesses = await this.service.getBusinesses(search, category, verified === "true");
    res.json(businesses);
  }

  public async getFeatured(req: Request, res: Response): Promise<void> {
    const businesses = await this.service.getFeatured("homepage_section", 8);
    res.json(businesses);
  }

  public async getFeaturedTop(req: Request, res: Response): Promise<void> {
    const businesses = await this.service.getFeatured("homepage_top", 6);
    res.json(businesses);
  }

  public async getTop(req: Request, res: Response): Promise<void> {
    const rows = await this.service.getTopVerified(8);
    res.json(rows);
  }

  public async getTrending(req: Request, res: Response): Promise<void> {
    const rows = await this.service.getTrending(8);
    res.json(rows);
  }

  public async getVerified(req: Request, res: Response): Promise<void> {
    const rows = await this.service.getVerifiedWithStats(12);
    res.json(rows);
  }

  public async getBusinessById(req: Request, res: Response): Promise<void> {
    const params = GetBusinessParams.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error.message);

    const business = await this.service.getBusinessById(params.data.id);
    res.json(business);
  }

  public async createBusiness(req: AuthRequest, res: Response): Promise<void> {
    const parsed = CreateBusinessBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const business = await this.service.createBusiness(req.userId!, parsed.data);
    res.status(201).json(business);
  }

  public async updateBusiness(req: AuthRequest, res: Response): Promise<void> {
    const params = UpdateBusinessParams.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error.message);

    const parsed = UpdateBusinessBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const business = await this.service.updateBusiness(req.userId!, req.user?.role, params.data.id, parsed.data);
    res.json(business);
  }

  public async setupSettlement(req: AuthRequest, res: Response): Promise<void> {
    const params = UpdateBusinessParams.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error.message);

    const parsed = SettlementBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const updated = await this.service.setupSettlement(req.userId!, params.data.id, parsed.data);
    res.json(updated);
  }

  public async deleteBusiness(req: AuthRequest, res: Response): Promise<void> {
    const params = DeleteBusinessParams.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error.message);

    await this.service.deleteBusiness(req.userId!, req.user?.role, params.data.id);
    res.sendStatus(204);
  }

  public async adminDeleteBusiness(req: AuthRequest, res: Response): Promise<void> {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "Admin only" });
      return;
    }

    const params = DeleteBusinessParams.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error.message);

    await this.service.adminDeleteBusiness(req.user!.id, req.user!.name, params.data.id);
    res.sendStatus(204);
  }

  public async adminFeatureBusiness(req: AuthRequest, res: Response): Promise<void> {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "Admin only" });
      return;
    }

    const params = GetBusinessParams.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error.message);

    const body = z.object({
      isFeatured: z.boolean(),
      featuredType: z.enum(["homepage_top", "homepage_section", "search_boost"]).optional().nullable(),
      featuredUntil: z.string().datetime().optional().nullable(),
    }).safeParse(req.body);

    if (!body.success) throw new ValidationError("isFeatured required");

    const business = await this.service.adminFeatureBusiness(req.user!.id, req.user!.name, params.data.id, body.data);
    res.json(business);
  }

  public async adminVerifyBusiness(req: AuthRequest, res: Response): Promise<void> {
    const params = VerifyBusinessParams.safeParse(req.params);
    if (!params.success) throw new ValidationError(params.error.message);

    const parsed = VerifyBusinessBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const adminId = req.user?.role === "admin" ? req.user.id : undefined;
    const adminName = req.user?.role === "admin" ? req.user.name : undefined;

    const business = await this.service.adminVerifyBusiness(adminId, adminName, params.data.id, parsed.data.isVerified, parsed.data.approvalStatus as any);
    res.json(business);
  }
}
