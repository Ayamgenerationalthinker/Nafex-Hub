import { CollectionsRepository } from "./collections.repository";
import { ForbiddenError, NotFoundError } from "../../shared/errors/AppError";

export class CollectionsService {
  private repository: CollectionsRepository;

  constructor(repository: CollectionsRepository) {
    this.repository = repository;
  }

  public async getCollectionsForBusiness(businessId: number) {
    const collections = await this.repository.getCollectionsByBusiness(businessId);
    const allProducts = await this.repository.getProductsByBusiness(businessId);

    return collections.map((col) => ({
      ...col,
      products: allProducts.filter((p) => p.collectionId === col.id),
    }));
  }

  public async createCollection(userId: number, data: { businessId: number, name: string, description?: string, coverImage?: string }) {
    const biz = await this.repository.getBusinessOwner(data.businessId);

    if (!biz || biz.ownerId !== userId) {
      throw new ForbiddenError("Forbidden");
    }

    return await this.repository.createCollection({
      businessId: data.businessId,
      name: data.name,
      description: data.description ?? null,
      coverImage: data.coverImage || null,
    });
  }

  public async checkOwnership(userId: number, collectionId: number) {
    const result = await this.repository.getCollectionWithBusiness(collectionId);
    if (!result || !result.business || result.business.ownerId !== userId) {
      return false;
    }
    return true;
  }

  public async updateCollection(userId: number, collectionId: number, data: any) {
    const isOwner = await this.checkOwnership(userId, collectionId);
    if (!isOwner) {
      throw new NotFoundError("Not found or forbidden");
    }

    return await this.repository.updateCollection(collectionId, data);
  }

  public async deleteCollection(userId: number, collectionId: number) {
    const isOwner = await this.checkOwnership(userId, collectionId);
    if (!isOwner) {
      throw new NotFoundError("Not found or forbidden");
    }

    await this.repository.removeCollectionFromProducts(collectionId);
    await this.repository.deleteCollection(collectionId);
  }
}
