import { Request, Response } from "express";
import { z } from "zod";
import { ProductsService } from "./products.service";
import { ValidationError } from "../../shared/errors/AppError";
import type { AuthRequest } from "../../lib/auth-middleware";

const IdParam = z.object({ id: z.coerce.number().int().positive() });
const BusinessIdParam = z.object({ businessId: z.coerce.number().int().positive() });

const CreateBody = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  discountPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  images: z.array(z.string()).default([]),
  stock: z.number().int().min(0).nullable().optional(),
  collectionId: z.number().int().positive().nullable().optional(),
});

const UpdateStockBody = z.object({
  stock: z.number().int().min(0).nullable(),
});

export class ProductsController {
  private service: ProductsService;

  constructor(service: ProductsService) {
    this.service = service;
  }

  public async getAdminProducts(req: AuthRequest, res: Response): Promise<void> {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "Admin only" });
      return;
    }
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const result = await this.service.getAdminProducts(search, page);
    res.json(result);
  }

  public async getDiscountedProducts(req: Request, res: Response): Promise<void> {
    const products = await this.service.getDiscountedProducts();
    res.json(products);
  }

  public async getProducts(req: Request, res: Response): Promise<void> {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const products = await this.service.getProducts(search, page);
    res.json(products);
  }

  public async getProductsByBusiness(req: Request, res: Response): Promise<void> {
    const params = BusinessIdParam.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid id");

    const products = await this.service.getProductsByBusiness(params.data.businessId);
    res.json(products);
  }

  public async getProductById(req: AuthRequest, res: Response): Promise<void> {
    const params = IdParam.safeParse(req.params);
    if (!params.success) throw new ValidationError("Not found");

    const product = await this.service.getProductById(params.data.id, req.userId);
    res.json(product);
  }

  public async createProduct(req: AuthRequest, res: Response): Promise<void> {
    const params = BusinessIdParam.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid id");

    const parsed = CreateBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const product = await this.service.createProduct(req.userId!, params.data.businessId, parsed.data);
    res.status(201).json(product);
  }

  public async updateProduct(req: AuthRequest, res: Response): Promise<void> {
    const params = IdParam.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid id");

    const parsed = CreateBody.partial().safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const product = await this.service.updateProduct(req.userId!, params.data.id, parsed.data);
    res.json(product);
  }

  public async updateStock(req: AuthRequest, res: Response): Promise<void> {
    const params = IdParam.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid id");

    const parsed = UpdateStockBody.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const product = await this.service.updateStock(req.userId!, params.data.id, parsed.data.stock);
    res.json(product);
  }

  public async deleteProduct(req: AuthRequest, res: Response): Promise<void> {
    const params = IdParam.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid id");

    await this.service.deleteProduct(req.userId!, params.data.id);
    res.json({ ok: true });
  }

  public async adminDeleteProduct(req: AuthRequest, res: Response): Promise<void> {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "Admin only" });
      return;
    }

    const params = IdParam.safeParse(req.params);
    if (!params.success) throw new ValidationError("Invalid id");

    await this.service.adminDeleteProduct(req.user!.id, req.user!.name, params.data.id);
    res.sendStatus(204);
  }
}
