import { logger } from "../../shared/logger";
import * as repo from "./marketing.repository";
import { logAdminAction } from "../../lib/log-admin-action";

// ── Boost tiers (constants) ───────────────────────────────────────────────────

export const BOOST_TIERS = {
  basic:   { label: "Basic",   pricePerWeek: 50,  featuredType: "search_boost",    badge: "Boosted",  description: "Appear higher in search results" },
  pro:     { label: "Pro",     pricePerWeek: 150, featuredType: "homepage_section", badge: "Featured", description: "Featured section on the homepage" },
  premium: { label: "Premium", pricePerWeek: 400, featuredType: "homepage_top",     badge: "Top Pick", description: "Top banner placement on homepage" },
} as const;

export type BoostTier = keyof typeof BOOST_TIERS;

const PAYSTACK_BASE   = "https://api.paystack.co";
const PAYSTACK_SECRET = process.env["PAYSTACK_SECRET_KEY"] ?? "";

// ── Boosts ────────────────────────────────────────────────────────────────────

export async function getMyBoosts(ownerId: number) {
  const business = await repo.getBusinessByOwner(ownerId);
  if (!business) return null;

  await repo.expireStaleBoosts(business.id);
  const [activeBoost, history, freshBusiness] = await Promise.all([
    repo.getActiveBoost(business.id),
    repo.getBoostHistory(business.id),
    repo.getBusinessFeaturedStatus(business.id),
  ]);

  return { businessId: business.id, active: activeBoost, isFeatured: freshBusiness?.isFeatured ?? false, featuredType: freshBusiness?.featuredType ?? null, featuredUntil: freshBusiness?.featuredUntil ?? null, history };
}

export async function initializeBoost(ownerId: number, tier: BoostTier, durationDays: number) {
  const business = await repo.getBusinessByOwner(ownerId);
  if (!business) return { error: "No business found. Please list your business first.", status: 404 };

  const tierInfo = BOOST_TIERS[tier];
  const weeks = durationDays / 7;
  const amountGHS = tierInfo.pricePerWeek * weeks;
  const amountPesewas = Math.round(amountGHS * 100);
  const reference = `BOOST-${business.id}-${Date.now()}`;

  const boost = await repo.createBoost({ businessId: business.id, tier, durationDays, amount: amountGHS.toString(), currency: "GHS", paymentRef: reference });
  await repo.createTransactionForBoost(ownerId, { amount: amountGHS.toString(), reference, boostId: boost.id, businessId: business.id, tier });

  return { reference, amountPesewas, boostId: boost.id };
}

export async function verifyBoostPayment(ownerId: number, reference: string, boostId: number) {
  const boost = await repo.getBoostById(boostId);
  if (!boost) return { error: "Boost not found", status: 404 };

  const business = await repo.getBusinessByOwner(ownerId);
  if (!business || business.id !== boost.businessId) return { error: "Not your business", status: 403 };

  if (boost.paymentStatus === "paid" && boost.isActive) return { boost, already: true };

  if (PAYSTACK_SECRET) {
    try {
      const response = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } });
      const data = (await response.json()) as { status: boolean; data: { status: string } };
      if (!data.status || data.data.status !== "success") return { error: "Payment not confirmed yet. Please complete payment first.", status: 402 };
    } catch {
      return { error: "Could not reach payment gateway", status: 502 };
    }
  }

  const { updatedBoost, expiresAt } = await repo.activateBoost(boost.id, boost.businessId, boost.tier, boost.durationDays, reference);
  return { boost: updatedBoost, expiresAt };
}

export async function handleBoostWebhook(event: { event: string; data: { reference: string; status: string; metadata?: { boostId?: number } } }) {
  if (event.event === "charge.success" && event.data.metadata?.boostId) {
    const boostId = event.data.metadata.boostId;
    const boost = await repo.getBoostById(boostId);
    if (boost && boost.paymentStatus !== "paid") {
      await repo.activateBoost(boost.id, boost.businessId, boost.tier, boost.durationDays, event.data.reference);
    }
  }
}

// ── Flash Sales ───────────────────────────────────────────────────────────────

export async function getActiveFlashSales() { return repo.getActiveFlashSales(); }
export async function getAllFlashSales()     { return repo.getAllFlashSales(); }

export async function createFlashSale(userId: number, data: {
  productId: number; title: string; description: string; discountPercent: number; startsAt: string; endsAt: string;
}) {
  const product = await repo.getProductById(data.productId);
  if (!product) return { error: "Product not found", status: 404 };

  const created = await repo.createFlashSale({
    productId: data.productId,
    title: data.title,
    description: data.description ?? "",
    discountPercent: data.discountPercent,
    startsAt: new Date(data.startsAt),
    endsAt: new Date(data.endsAt),
    createdBy: userId,
  });
  return { data: created };
}

export async function toggleFlashSale(id: number, isActive: boolean) {
  const updated = await repo.updateFlashSaleActive(id, isActive);
  return updated;
}

export async function removeFlashSale(id: number) {
  return repo.deleteFlashSale(id);
}

// ── Services ──────────────────────────────────────────────────────────────────

export async function getActiveServices() { return repo.getActiveServices(); }
export async function getAllServices()     { return repo.getAllServices(); }

export async function createService(adminId: number, adminName: string, data: { title: string; description: string; image?: string | null; isActive?: boolean }) {
  const service = await repo.createService({ ...data, isActive: data.isActive ?? true });
  await logAdminAction({ adminId, adminName, action: "create_service", targetType: "service", targetId: String(service.id), details: { title: service.title } });
  return service;
}

export async function updateService(adminId: number, adminName: string, id: number, data: { title: string; description: string; image?: string | null; isActive?: boolean }) {
  const service = await repo.updateService(id, { ...data, isActive: data.isActive ?? true });
  if (!service) return null;
  await logAdminAction({ adminId, adminName, action: "update_service", targetType: "service", targetId: String(service.id), details: { title: service.title } });
  return service;
}

export async function toggleService(adminId: number, adminName: string, id: number) {
  const service = await repo.toggleService(id);
  if (!service) return null;
  await logAdminAction({ adminId, adminName, action: service.isActive ? "activate_service" : "deactivate_service", targetType: "service", targetId: String(service.id), details: { title: service.title } });
  return service;
}

export async function deleteService(adminId: number, adminName: string, id: number) {
  const service = await repo.deleteService(id);
  if (!service) return null;
  await logAdminAction({ adminId, adminName, action: "delete_service", targetType: "service", targetId: String(service.id), details: { title: service.title } });
  return service;
}

// ── Newsletter ────────────────────────────────────────────────────────────────

const newsletterEmails = new Set<string>();
const newsletterSubmissions: Array<{ email: string; name?: string; submittedAt: string }> = [];

export function subscribeToNewsletter(email: string, name?: string, source?: string) {
  const normalised = email.toLowerCase().trim();
  if (newsletterEmails.has(normalised)) return { error: "This email address is already subscribed to our newsletter.", status: 400 };

  newsletterEmails.add(normalised);
  newsletterSubmissions.push({ email: normalised, name: name?.trim(), submittedAt: new Date().toISOString() });

  logger.info({ subscriberEmail: normalised, subscriberName: name, totalSubscribers: newsletterEmails.size }, `Newsletter subscription created for ${normalised}`);
  return { subscriberEmail: normalised };
}

export function getNewsletterSubmissions() {
  return { targetAdminEmail: "nafexgroupltd@gmail.com", total: newsletterSubmissions.length, submissions: newsletterSubmissions };
}
