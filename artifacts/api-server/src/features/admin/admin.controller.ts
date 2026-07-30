import { type Request, type Response } from "express";
import { type AuthRequest } from "../../lib/auth-middleware";
import * as service from "./admin.service";
import { z } from "zod";
import { GetAdminBusinessesQueryParams } from "@workspace/api-zod";

function parseId(param: string | string[]): number {
  return parseInt(Array.isArray(param) ? param[0] : param, 10);
}

function isAdmin(req: AuthRequest, res: Response): boolean {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

// ── Activity ──────────────────────────────────────────────────────────────────

export async function getActivity(req: AuthRequest, res: Response): Promise<void> {
  if (!isAdmin(req, res)) return;
  const limit = Math.min(parseInt((req.query.limit as string) ?? "100", 10), 200);
  const rows = await service.getActivity(limit);
  res.json(rows);
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function listUsers(req: AuthRequest, res: Response): Promise<void> {
  if (!isAdmin(req, res)) return;
  const { search } = req.query as { search?: string };
  const rows = await service.listUsers(search);
  res.json(rows);
}

export async function changeUserRole(req: AuthRequest, res: Response): Promise<void> {
  if (!isAdmin(req, res)) return;
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = z.object({ role: z.enum(["user", "business_owner", "admin"]) }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid role" }); return; }

  if (req.user?.id === id && body.data.role !== "admin") {
    res.status(400).json({ error: "Cannot remove your own admin role" });
    return;
  }

  const updated = await service.changeUserRole(req.user!.id, req.user!.name, id, body.data.role);
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json(updated);
}

export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  if (!isAdmin(req, res)) return;
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  if (req.user?.id === id) { res.status(400).json({ error: "You cannot delete your own account" }); return; }

  const outcome = await service.removeUser(req.user!.id, req.user!.name, id);
  if (!outcome.ok) { res.status(outcome.status).json(outcome.body); return; }
  res.sendStatus(204);
}

// ── Product moderation ────────────────────────────────────────────────────────

export async function getPendingProducts(req: AuthRequest, res: Response): Promise<void> {
  if (!isAdmin(req, res)) return;
  try {
    res.json(await service.getPendingProducts());
  } catch {
    res.status(500).json({ error: "Failed to fetch pending products" });
  }
}

export async function approveProduct(req: AuthRequest, res: Response): Promise<void> {
  if (!isAdmin(req, res)) return;
  const id = parseId(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await service.approveProduct(req.user!.id, req.user!.name, id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to approve product" });
  }
}

export async function rejectProduct(req: AuthRequest, res: Response): Promise<void> {
  if (!isAdmin(req, res)) return;
  const id = parseId(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = z.object({ reason: z.string().min(1, "Reason is required") }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Reason is required" }); return; }

  try {
    await service.rejectProduct(req.user!.id, req.user!.name, id, parsed.data.reason);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to reject product" });
  }
}

// ── KYC ───────────────────────────────────────────────────────────────────────

export async function updateKyc(req: AuthRequest, res: Response): Promise<void> {
  if (!isAdmin(req, res)) return;
  const id = parseId(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = z.object({
    verificationTier: z.enum(["bronze", "silver", "gold"]),
    kycNotes: z.string().optional(),
    isVerified: z.boolean().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  try {
    await service.updateKyc(req.user!.id, req.user!.name, id, parsed.data);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update KYC tier" });
  }
}

// ── Financial summary ─────────────────────────────────────────────────────────

export async function getFinancialSummary(req: AuthRequest, res: Response): Promise<void> {
  if (!isAdmin(req, res)) return;
  try {
    res.json(await service.getFinancialSummary());
  } catch {
    res.status(500).json({ error: "Failed to load financial summary" });
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getAdminStats(req: AuthRequest, res: Response): Promise<void> {
  if (req.user?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  res.json(await service.getAdminStats());
}

export async function getPublicStats(_req: Request, res: Response): Promise<void> {
  res.json(await service.getPublicStats());
}

export async function getCategories(_req: Request, res: Response): Promise<void> {
  res.json(await service.getCategories());
}

export async function getAdminBusinesses(req: Request, res: Response): Promise<void> {
  const query = GetAdminBusinessesQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  res.json(await service.getAdminBusinesses(query.data));
}

export async function getFeaturedAnalytics(req: AuthRequest, res: Response): Promise<void> {
  if (req.user?.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  res.json(await service.getFeaturedAnalytics());
}
