import { BusinessesRepository } from "./businesses.repository";
import { ForbiddenError, NotFoundError, AppError } from "../../shared/errors/AppError";
import { sendAdminEmail } from "../../lib/mailer";
import { logAdminAction } from "../../lib/log-admin-action";

// Simple wrapper for paystackPost until payments is migrated
import { paymentsService } from "../payments/payments.routes";

export class BusinessesService {
  private repository: BusinessesRepository;

  constructor(repository: BusinessesRepository) {
    this.repository = repository;
  }

  public async getBusinesses(search?: string, category?: string, verified?: boolean) {
    return await this.repository.getBusinesses(search, category, verified);
  }

  public async getFeatured(type: string, limit: number) {
    return await this.repository.getFeatured(type, limit);
  }

  public async getTopVerified(limit: number) {
    return await this.repository.getTopVerified(limit);
  }

  public async getTrending(limit: number) {
    return await this.repository.getTrending(limit);
  }

  public async getVerifiedWithStats(limit: number) {
    return await this.repository.getVerifiedWithStats(limit);
  }

  public async getBusinessById(id: number) {
    const biz = await this.repository.getBusinessById(id);
    if (!biz) throw new NotFoundError("Business not found");
    return biz;
  }

  public async createBusiness(userId: number, data: any) {
    const biz = await this.repository.createBusiness({
      ...data,
      ownerId: userId,
      images: data.images ?? [],
    });

    sendAdminEmail(
      "New Business Onboarded",
      `A new business has been added to Nafex Hub and may need verification.\n\nBusiness: ${biz.name}\nCategory: ${biz.category}\nLocation: ${biz.location}\nDate: ${new Date().toUTCString()}`
    );

    return biz;
  }

  public async updateBusiness(userId: number, userRole: string | undefined, id: number, data: any) {
    const existing = await this.repository.getBusinessById(id);
    if (!existing) throw new NotFoundError("Business not found");

    if (existing.ownerId !== userId && userRole !== "admin") {
      throw new ForbiddenError("Forbidden");
    }

    return await this.repository.updateBusiness(id, data);
  }

  public async setupSettlement(userId: number, id: number, settlementData: any) {
    const existing = await this.repository.getBusinessById(id);
    if (!existing) throw new NotFoundError("Business not found");
    if (existing.ownerId !== userId) throw new ForbiddenError("Unauthorized");

    try {
      const paystackRes = await paymentsService.paystackPost<{ recipient_code: string }>("/transferrecipient", {
        type: settlementData.type,
        name: settlementData.name,
        account_number: settlementData.account_number,
        bank_code: settlementData.bank_code,
        currency: "GHS",
      });

      return await this.repository.updateBusiness(id, {
        paystackRecipientCode: paystackRes.recipient_code,
        settlementBank: settlementData.bank_code,
        settlementAccount: settlementData.account_number,
      });
    } catch (error) {
      throw new AppError((error as Error).message, 400);
    }
  }

  public async deleteBusiness(userId: number, userRole: string | undefined, id: number) {
    const existing = await this.repository.getBusinessById(id);
    if (!existing) throw new NotFoundError("Business not found");

    if (existing.ownerId !== userId && userRole !== "admin") {
      throw new ForbiddenError("Forbidden");
    }

    await this.repository.deleteBusiness(id);
  }

  public async adminDeleteBusiness(adminId: number, adminName: string, id: number) {
    const biz = await this.repository.deleteBusiness(id);
    if (!biz) throw new NotFoundError("Business not found");

    await logAdminAction({
      adminId,
      adminName,
      action: "delete_business",
      targetType: "business",
      targetId: String(biz.id),
      details: { businessName: biz.name },
    });
  }

  public async adminFeatureBusiness(adminId: number, adminName: string, id: number, featuredData: any) {
    const updateData: Record<string, unknown> = { isFeatured: featuredData.isFeatured };
    if (!featuredData.isFeatured) {
      updateData.featuredType = null;
      updateData.featuredUntil = null;
    } else {
      if (featuredData.featuredType !== undefined) updateData.featuredType = featuredData.featuredType;
      if (featuredData.featuredUntil !== undefined) {
        updateData.featuredUntil = featuredData.featuredUntil ? new Date(featuredData.featuredUntil) : null;
      }
    }

    const biz = await this.repository.updateBusiness(id, updateData);
    if (!biz) throw new NotFoundError("Business not found");

    await logAdminAction({
      adminId,
      adminName,
      action: featuredData.isFeatured ? "feature_business" : "unfeature_business",
      targetType: "business",
      targetId: String(biz.id),
      details: { businessName: biz.name, featuredType: featuredData.featuredType, featuredUntil: featuredData.featuredUntil },
    });

    return biz;
  }

  public async adminVerifyBusiness(adminId: number | undefined, adminName: string | undefined, id: number, isVerified: boolean) {
    const biz = await this.repository.updateBusiness(id, { isVerified });
    if (!biz) throw new NotFoundError("Business not found");

    if (adminId && adminName) {
      await logAdminAction({
        adminId,
        adminName,
        action: isVerified ? "verify_business" : "unverify_business",
        targetType: "business",
        targetId: String(biz.id),
        details: { businessName: biz.name },
      });
    }

    return biz;
  }
}
