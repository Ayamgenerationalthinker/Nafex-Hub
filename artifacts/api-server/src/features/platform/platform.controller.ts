import { type Request, type Response } from "express";
import { type AuthRequest } from "../../lib/auth-middleware";
import * as repo from "./platform.repository";
import { logAdminAction } from "../../lib/log-admin-action";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { mkdirSync, writeFileSync } from "fs";
import crypto from "crypto";
import sharp from "sharp";

// ── Favorites ─────────────────────────────────────────────────────────────────

const ToggleBody = z.object({
  businessId: z.number().int().positive().optional(),
  productId: z.number().int().positive().optional(),
});

export async function getFavorites(req: AuthRequest, res: Response): Promise<void> {
  const favs = await repo.getFavoritesByUser(req.userId!);
  const businessIds = favs.filter((f) => f.businessId).map((f) => f.businessId!);
  const productIds  = favs.filter((f) => f.productId).map((f) => f.productId!);

  const [businesses, products] = await Promise.all([
    repo.getBusinessesByIds(businessIds),
    repo.getProductsWithBusinessByIds(productIds),
  ]);

  res.json({ businesses, products, favoriteIds: favs.map((f) => ({ id: f.id, businessId: f.businessId, productId: f.productId })) });
}

export async function toggleFavorite(req: AuthRequest, res: Response): Promise<void> {
  const parsed = ToggleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  if (!parsed.data.businessId && !parsed.data.productId) { res.status(400).json({ error: "businessId or productId required" }); return; }

  const existing = await repo.findFavorite(req.userId!, parsed.data.businessId, parsed.data.productId);
  if (existing.length > 0) {
    await repo.deleteFavorite(existing[0].id);
    res.json({ favorited: false, id: existing[0].id });
  } else {
    const fav = await repo.createFavorite(req.userId!, parsed.data.businessId, parsed.data.productId);
    res.json({ favorited: true, id: fav.id });
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  const rows = await repo.getNotifications(req.userId!);
  res.json(rows.reverse());
}

export async function getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
  const count = await repo.getUnreadCount(req.userId!);
  res.json({ count });
}

export async function markRead(req: AuthRequest, res: Response): Promise<void> {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await repo.markNotificationRead(id, req.userId!);
  res.json({ ok: true });
}

export async function markAllRead(req: AuthRequest, res: Response): Promise<void> {
  await repo.markAllNotificationsRead(req.userId!);
  res.json({ ok: true });
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings(_req: Request, res: Response): Promise<void> {
  const rows = await repo.getAllSettings();
  const out: Record<string, string> = {};
  for (const row of rows) out[row.key] = row.value;
  res.json(out);
}

export async function updateAdminSetting(req: AuthRequest, res: Response): Promise<void> {
  if (req.user?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
  const body = z.object({ key: z.string().min(1), value: z.string() }).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid body" }); return; }

  await repo.upsertSetting(body.data.key, body.data.value);
  await logAdminAction({ adminId: req.user!.id, adminName: req.user!.name, action: "update_setting", targetType: "setting", targetId: body.data.key, details: { key: body.data.key } });
  res.json({ ok: true });
}

// ── Upload ────────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hasCloudinary = !!process.env["CLOUDINARY_CLOUD_NAME"] && !!process.env["CLOUDINARY_API_KEY"] && !!process.env["CLOUDINARY_API_SECRET"];

const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
mkdirSync(UPLOADS_DIR, { recursive: true });

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"));
};

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
}).single("image");

export async function uploadImage(req: Request, res: Response): Promise<void> {
  if (!req.file) { res.status(400).json({ error: "No image file provided", message: "No image file provided" }); return; }

  try {
    const processedBuffer = await sharp(req.file.buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    if (hasCloudinary) {
      const { v2: cloudinary } = await import("cloudinary");
      cloudinary.config({
        cloud_name: process.env["CLOUDINARY_CLOUD_NAME"],
        api_key: process.env["CLOUDINARY_API_KEY"],
        api_secret: process.env["CLOUDINARY_API_SECRET"],
      });

      const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "nafex-hub" },
          (error, result) => { if (error || !result) reject(error); else resolve(result); }
        );
        stream.end(processedBuffer);
      });

      res.json({ url: result.secure_url, publicId: result.public_id });
    } else {
      const rand = crypto.randomBytes(8).toString("hex");
      const filename = `${Date.now()}-${rand}.webp`;
      const filepath = path.join(UPLOADS_DIR, filename);
      
      writeFileSync(filepath, processedBuffer);
      
      const url = `/api/uploads/${filename}`;
      res.json({ url, publicId: filename });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    res.status(500).json({ error: message, message });
  }
}
