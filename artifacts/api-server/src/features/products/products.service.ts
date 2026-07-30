import { ProductsRepository } from "./products.repository";
import { ForbiddenError, NotFoundError } from "../../shared/errors/AppError";
import { logAdminAction } from "../../lib/log-admin-action";

export class ProductsService {
  private repository: ProductsRepository;

  constructor(repository: ProductsRepository) {
    this.repository = repository;
  }

  public async getAdminProducts(search?: string, page = 1) {
    return await this.repository.getAdminProducts(search, page);
  }

  public async getDiscountedProducts() {
    return await this.repository.getDiscountedProducts();
  }

  public async getProducts(search?: string, page = 1) {
    return await this.repository.getProducts(search, page);
  }

  public async getProductsByBusiness(businessId: number) {
    return await this.repository.getProductsByBusiness(businessId);
  }

  public async getProductById(id: number, userId?: number) {
    const product = await this.repository.getProductById(id);
    if (!product) throw new NotFoundError("Product not found");

    const isFavorite = userId ? await this.repository.checkFavorite(userId, id) : false;

    return { ...product, isFavorite };
  }

  public async createProduct(userId: number, businessId: number, data: any) {
    const biz = await this.repository.getBusinessOwner(businessId);
    if (!biz || biz.ownerId !== userId) {
      throw new ForbiddenError("Forbidden");
    }

    return await this.repository.createProduct({
      businessId,
      name: data.name,
      description: data.description,
      price: data.price,
      discountPrice: data.discountPrice ?? null,
      images: data.images,
      stock: data.stock ?? null,
      collectionId: data.collectionId ?? null,
    });
  }

  public async updateProduct(userId: number, id: number, data: any) {
    const biz = await this.repository.getProductOwner(id);
    if (!biz || biz.ownerId !== userId) {
      throw new ForbiddenError("Forbidden");
    }

    const product = await this.repository.updateProduct(id, data);
    if (!product) throw new NotFoundError("Product not found");
    return product;
  }

  public async updateStock(userId: number, id: number, stock: number | null) {
    const biz = await this.repository.getProductOwner(id);
    if (!biz || biz.ownerId !== userId) {
      throw new ForbiddenError("Forbidden");
    }

    const product = await this.repository.updateProduct(id, { stock });
    if (!product) throw new NotFoundError("Product not found");
    return product;
  }

  public async deleteProduct(userId: number, id: number) {
    const biz = await this.repository.getProductOwner(id);
    if (!biz || biz.ownerId !== userId) {
      throw new ForbiddenError("Forbidden");
    }

    const product = await this.repository.deleteProduct(id);
    if (!product) throw new NotFoundError("Product not found");
  }

  public async adminDeleteProduct(adminId: number, adminName: string, id: number) {
    const product = await this.repository.deleteProduct(id);
    if (!product) throw new NotFoundError("Product not found");

    await logAdminAction({
      adminId,
      adminName,
      action: "delete_product",
      targetType: "product",
      targetId: String(product.id),
      details: { productName: product.name, businessId: product.businessId },
    });
  }
}
