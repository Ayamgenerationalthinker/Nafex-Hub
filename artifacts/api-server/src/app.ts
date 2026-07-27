import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { mkdirSync, existsSync } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app: Express = express();

// Trust the first proxy hop (Replit dev proxy, Cloud Run load balancer)
// Required for express-rate-limit and correct IP detection behind proxies
app.set("trust proxy", 1);

// Health check must be registered BEFORE the HTTPS-redirect middleware.
// Cloud Run probes hit http://localhost:<PORT>/api/healthz internally —
// they never carry x-forwarded-proto:https, so any redirect kills the promote step.
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Derive allowed origin from Replit domains env in production, fallback for dev
const allowedOrigins = (() => {
  // Explicit override — highest priority
  const explicit = process.env["ALLOWED_ORIGINS"];
  if (explicit) return explicit.split(",").map((d) => d.trim());

  // Replit managed deployment
  const replitDomains = process.env["REPLIT_DOMAINS"];
  if (replitDomains) return replitDomains.split(",").map((d) => `https://${d.trim()}`);

  // Local dev defaults
  return ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];
})();

app.use(helmet({
  contentSecurityPolicy: false,
  // Additional hardening headers
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  xContentTypeOptions: true,
  xFrameOptions: { action: "sameorigin" },
}));

if (process.env["NODE_ENV"] === "production") {
  app.use((req, res, next) => {
    if (req.headers["x-forwarded-proto"] !== "https") {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin requests (no origin header) and all listed domains
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Return a clean CORS blocked response, not a 500
      logger.warn({ origin }, "CORS blocked request from unlisted origin");
      callback(null, false);
    }
  },
  credentials: true,
}));

app.use(pinoHttp({
  logger,
  serializers: {
    req(req) {
      return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
}));

app.use(express.json({
  verify: (req, res, buf) => {
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Rate limiting for sensitive user actions (orders/payments/disputes/chat)
// Helps protect against brute force, scraping, and accidental request storms.
const sensitiveApiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again shortly." },
});

app.use("/api/orders", sensitiveApiLimiter);
app.use("/api/payments", sensitiveApiLimiter);
app.use("/api/disputes", sensitiveApiLimiter);
app.use("/api/conversations", sensitiveApiLimiter);

// Serve uploaded images as static files at /api/uploads/
const uploadsDir = path.resolve(__dirname, "../../uploads");
mkdirSync(uploadsDir, { recursive: true });
app.use("/api/uploads", express.static(uploadsDir));

app.use("/api", router);

// Serve frontend static assets (dynamically resolved from process.cwd() and __dirname)
const cwd = process.cwd();
const candidates = [
  path.resolve(cwd, "dist/public"),
  path.resolve(cwd, "artifacts/nafex-hub/dist/public"),
  path.resolve(__dirname, "../../../artifacts/nafex-hub/dist/public"),
  path.resolve(__dirname, "../../../dist/public"),
  path.resolve(__dirname, "../../nafex-hub/dist/public"),
];
const frontendPath = candidates.find((p) => existsSync(path.join(p, "index.html"))) || candidates[0];

if (existsSync(frontendPath)) {
  logger.info({ frontendPath }, "Serving frontend static assets");
  app.use(express.static(frontendPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("index.html") || filePath.endsWith("sw.js")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, private");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    }
  }));

  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    const indexPath = path.join(frontendPath, "index.html");
    if (existsSync(indexPath)) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, private");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      return res.sendFile(indexPath);
    }
    next();
  });
}

// Global error handler so Express 5 errors return JSON
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(err, "Unhandled error in Express");
  res.status(err.status || 500).json({ 
    error: process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message || "Internal Server Error"
  });
});

export default app;
