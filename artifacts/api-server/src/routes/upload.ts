import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";
import { requireAuth } from "../lib/auth-middleware";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
mkdirSync(UPLOADS_DIR, { recursive: true });

const router: IRouter = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"));
    }
  },
});

router.post("/upload", requireAuth, upload.single("image"), (req, res): void => {
  if (!req.file) {
    res.status(400).json({ error: "No image file provided" });
    return;
  }
  const url = `/api/uploads/${req.file.filename}`;
  res.json({ url, publicId: req.file.filename });
});

export default router;
