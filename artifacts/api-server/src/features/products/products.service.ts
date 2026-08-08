import { ProductsRepository } from "./products.repository";
import { ForbiddenError, NotFoundError } from "../../shared/errors/AppError";
import { logAdminAction } from "../../lib/log-admin-action";
import { generateSkuPrefix, generateVariantSku } from "../../lib/sku-generator";
import { notifyBuyer, notifyAdmins } from "../../lib/notify";

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

    notifyAdmins({
      type: "admin_product_pending",
      title: `Product Pending Approval: ${product.name}`,
      body: `New product "${product.name}" created by seller #${userId} and awaiting moderation.`,
      metadata: { productId: product.id, businessId },
      actorId: userId,
      relatedId: product.id,
    }).catch(() => {});

    return { ...product, variants: variantsToSave };
  }

  public async updateProduct(userId: number, id: number, data: any) {
    const biz = await this.repository.getProductOwner(id);
    if (!biz || biz.ownerId !== userId) {
      throw new ForbiddenError("Forbidden");
    }

    const previousProduct = await this.repository.getProductById(id);
    const product = await this.repository.updateProduct(id, data);
    if (!product) throw new NotFoundError("Product not found");

    // Check wishlist notifications (back_in_stock & price_drop)
    try {
      const favoritedUserIds = await this.repository.getFavoritedUserIds(id);
      if (favoritedUserIds.length > 0) {
        const wasOutOfStock = !previousProduct || previousProduct.stock === null || previousProduct.stock <= 0;
        const isNowInStock = product.stock !== null && product.stock > 0;
        if (wasOutOfStock && isNowInStock) {
          favoritedUserIds.forEach((buyerId) => {
            notifyBuyer(buyerId, {
              type: "back_in_stock",
              title: `Back in stock: ${product.name}`,
              body: `"${product.name}" from your wishlist is now back in stock!`,
              metadata: { productId: product.id },
              relatedId: product.id,
            });
          });
        }

        const prevPrice = Number(previousProduct?.discountPrice ?? previousProduct?.price ?? 0);
        const currentPrice = Number(product.discountPrice ?? product.price ?? 0);
        if (prevPrice > 0 && currentPrice < prevPrice) {
          favoritedUserIds.forEach((buyerId) => {
            notifyBuyer(buyerId, {
              type: "price_drop",
              title: `Price drop on ${product.name}!`,
              body: `An item in your wishlist is now GHS ${(currentPrice / 100).toFixed(2)}.`,
              metadata: { productId: product.id, newPrice: currentPrice, oldPrice: prevPrice },
              relatedId: product.id,
            });
          });
        }
      }
    } catch {}

    return product;
  }

  public async updateStock(userId: number, id: number, stock: number | null) {
    const biz = await this.repository.getProductOwner(id);
    if (!biz || biz.ownerId !== userId) {
      throw new ForbiddenError("Forbidden");
    }

    const previousProduct = await this.repository.getProductById(id);
    const product = await this.repository.updateProduct(id, { stock });
    if (!product) throw new NotFoundError("Product not found");

    // Check back in stock notification for wishlist users
    try {
      const wasOutOfStock = !previousProduct || previousProduct.stock === null || previousProduct.stock <= 0;
      const isNowInStock = stock !== null && stock > 0;
      if (wasOutOfStock && isNowInStock) {
        const favoritedUserIds = await this.repository.getFavoritedUserIds(id);
        favoritedUserIds.forEach((buyerId) => {
          notifyBuyer(buyerId, {
            type: "back_in_stock",
            title: `Back in stock: ${product.name}`,
            body: `"${product.name}" from your wishlist is now back in stock!`,
            metadata: { productId: product.id },
            relatedId: product.id,
          });
        });
      }
    } catch {}

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
