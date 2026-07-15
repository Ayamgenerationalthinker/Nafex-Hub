import { Router } from "express";
import { db, productsTable, businessesTable, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import { logAdminAction } from "../lib/log-admin-action";
import { z } from "zod";

const router = Router();

const adminOnly = (req: AuthRequest, res: any): boolean => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
};

function parseId(param: string | string[]): number {
  return parseInt(Array.isArray(param) ? param[0] : param, 10);
}

/* ─────────────────────────────────────────────────────
   PRODUCT MODERATION
   ───────────────────────────────────────────────────── */

// GET /api/admin/products/pending — listing moderation queue
router.get("/api/admin/products/pending", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!adminOnly(req, res)) return;
  try {
    const rows = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        description: productsTable.description,
        price: productsTable.price,
        images: productsTable.images,
        stock: productsTable.stock,
        approvalStatus: productsTable.approvalStatus,
        rejectionReason: productsTable.rejectionReason,
        createdAt: productsTable.createdAt,
        businessId: productsTable.businessId,
        businessName: businessesTable.name,
        businessLogo: businessesTable.logo,
      })
      .from(productsTable)
      .leftJoin(businessesTable, eq(productsTable.businessId, businessesTable.id))
      .where(eq(productsTable.approvalStatus, "pending"))
      .orderBy(productsTable.createdAt);

    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch pending products" });
  }
});

// PATCH /api/admin/product/:id/approve — approve a product
router.patch("/api/admin/product/:id/approve", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!adminOnly(req, res)) return;
  const id = parseId(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    await db.update(productsTable)
      .set({ approvalStatus: "approved", rejectionReason: null })
      .where(eq(productsTable.id, id));

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.name,
      action: "product_approved",
      targetType: "product",
      targetId: String(id),
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to approve product" });
  }
});

// PATCH /api/admin/product/:id/reject — reject a product with reason
const rejectSchema = z.object({ reason: z.string().min(1, "Reason is required") });

router.patch("/api/admin/product/:id/reject", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!adminOnly(req, res)) return;
  const id = parseId(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = rejectSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Reason is required" }); return; }

  try {
    await db.update(productsTable)
      .set({ approvalStatus: "rejected", rejectionReason: parsed.data.reason })
      .where(eq(productsTable.id, id));

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.name,
      action: "product_rejected",
      targetType: "product",
      targetId: String(id),
      details: { reason: parsed.data.reason },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to reject product" });
  }
});

/* ─────────────────────────────────────────────────────
   KYC / BUSINESS VERIFICATION TIER
   ───────────────────────────────────────────────────── */

const kycSchema = z.object({
  verificationTier: z.enum(["bronze", "silver", "gold"]),
  kycNotes: z.string().optional(),
  isVerified: z.boolean().optional(),
});

// PATCH /api/admin/businesses/:id/kyc — set verification tier
router.patch("/api/admin/businesses/:id/kyc", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!adminOnly(req, res)) return;
  const id = parseId(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = kycSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  try {
    const update: Record<string, any> = {
      verificationTier: parsed.data.verificationTier,
      kycNotes: parsed.data.kycNotes ?? null,
    };
    if (parsed.data.isVerified !== undefined) {
      update.isVerified = parsed.data.isVerified;
    } else if (parsed.data.verificationTier === "gold") {
      update.isVerified = true;
    }

    await db.update(businessesTable).set(update).where(eq(businessesTable.id, id));

    await logAdminAction({
      adminId: req.user!.id,
      adminName: req.user!.name,
      action: "kyc_tier_updated",
      targetType: "business",
      targetId: String(id),
      details: { tier: parsed.data.verificationTier },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update KYC tier" });
  }
});

/* ─────────────────────────────────────────────────────
   FINANCIAL ANALYTICS (GMV, Revenue, Payouts)
   ───────────────────────────────────────────────────── */

// GET /api/admin/financial-summary — GMV, net revenue, pending payouts
router.get("/api/admin/financial-summary", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  if (!adminOnly(req, res)) return;
  try {
    const rows = await db.select().from(transactionsTable);

    const summary = {
      gmv: 0,
      netRevenue: 0,
      refunded: 0,
      payoutsReleased: 0,
      pendingEscrow: 0,
      failedTxns: 0,
      totalTxns: rows.length,
    };

    for (const t of rows) {
      const amount = Number(t.amount);
      if (t.type === "payment" && t.status === "success") summary.gmv += amount;
      if (t.type === "refund" && t.status === "success") summary.refunded += amount;
      if (t.type === "payout" && t.status === "success") summary.payoutsReleased += amount;
      if (t.type === "payment" && t.status === "pending") summary.pendingEscrow += amount;
      if (t.status === "failed") summary.failedTxns += 1;
    }

    // Net revenue = 5% platform fee on GMV
    summary.netRevenue = summary.gmv * 0.05;

    res.json(summary);
  } catch {
    res.status(500).json({ error: "Failed to load financial summary" });
  }
});

export default router;
