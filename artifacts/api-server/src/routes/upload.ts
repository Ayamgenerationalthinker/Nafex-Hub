import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";
import { requireAuth } from "../lib/auth-middleware";
import { validateBody, validateQuery } from "../lib/validation";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router: IRouter = Router();

const hasCloudinary =
  !!process.env["CLOUDINARY_CLOUD_NAME"] &&
  !!process.env["CLOUDINARY_API_KEY"] &&
  !!process.env["CLOUDINARY_API_SECRET"];

// --- Local disk storage (fallback when Cloudinary is not configured) ---
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
mkdirSync(UPLOADS_DIR, { recursive: true });

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"));
};

const upload = multer({
  storage: hasCloudinary ? multer.memoryStorage() : diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

router.post("/upload", requireAuth, upload.single("image"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No image file provided" });
    return;
  }

  try {
    if (hasCloudinary) {
      // Stream to Cloudinary
      const { v2: cloudinary } = await import("cloudinary");
      cloudinary.config({
        cloud_name: process.env["CLOUDINARY_CLOUD_NAME"],
        api_key: process.env["CLOUDINARY_API_KEY"],
        api_secret: process.env["CLOUDINARY_API_SECRET"],
      });

      const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "nafex-hub",
            transformation: [
              { width: 1200, height: 1200, crop: "limit" },
              { quality: "auto" },
              { fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error || !result) reject(error);
            else resolve(result);
          }
        );
        stream.end((req.file as Express.Multer.File).buffer);
      });

      res.json({ url: result.secure_url, publicId: result.public_id });
    } else {
      // Local disk — serve from /api/uploads/
      const url = `/api/uploads/${req.file.filename}`;
      res.json({ url, publicId: req.file.filename });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    res.status(500).json({ error: message });
  }
});

export default router;
