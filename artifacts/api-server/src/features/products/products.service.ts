import { ProductsRepository } from "./products.repository";
import { ForbiddenError, NotFoundError } from "../../shared/errors/AppError";
import { logAdminAction } from "../../lib/log-admin-action";
import { generateSkuPrefix, generateVariantSku } from "../../lib/sku-generator";

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

    const skuPrefix = generateSkuPrefix(data.name, data.category, data.brand, data.model);
    
    const product = await this.repository.createProduct({
      businessId,
      name: data.name,
      description: data.description,
      category: data.category || "General",
      brand: data.brand || null,
      model: data.model || null,
      skuPrefix,
      price: data.price,
      discountPrice: data.discountPrice ?? null,
      images: data.images,
      stock: data.stock ?? 0, // Fallback to 0
      collectionId: data.collectionId ?? null,
    });

    let seq = await this.repository.getHighestVariantSequence(skuPrefix);

    const inputVariants = Array.isArray(data.variants) && data.variants.length > 0 
      ? data.variants 
      : [{ attributes: {}, stock: data.stock ?? 0, price: data.price }];

    const variantsToSave = inputVariants.map((v: any) => {
      seq += 1;
      return {
        productId: product.id,
        sku: generateVariantSku(skuPrefix, v.attributes || {}, seq),
        attributes: v.attributes || {},
        stock: v.stock ?? 0,
        price: v.price || null,
      };
    });

    await this.repository.saveVariants(variantsToSave);

    return { ...product, variants: variantsToSave };
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
