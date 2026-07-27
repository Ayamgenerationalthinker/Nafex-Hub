import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import router from "./routes";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";

const app = express();

app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

const allowedOrigins = (() => {
  const explicit = process.env["ALLOWED_ORIGINS"];
  if (explicit) return explicit.split(",").map((d) => d.trim());
  const replitDomains = process.env["REPLIT_DOMAINS"];
  if (replitDomains) return replitDomains.split(",").map((d) => `https://${d.trim()}`);
  return ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];
})();

app.use(helmet({
  contentSecurityPolicy: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  xContentTypeOptions: true,
  xFrameOptions: { action: "sameorigin" },
}));

if (process.env["NODE_ENV"] === "production") {
  app.use((req, res, next) => {
    const proto = req.headers["x-forwarded-proto"];
    const host = req.headers.host;
    if (proto === "http" && host && !req.path.startsWith("/api/healthz")) {
      return res.redirect(301, `https://${host}${req.url}`);
    }
    next();
  });
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
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

const uploadsDir = path.resolve(__dirname, "../../uploads");
mkdirSync(uploadsDir, { recursive: true });
app.use("/api/uploads", express.static(uploadsDir));

app.use("/api", router);

// Serve frontend static assets (dynamically resolved from process.cwd() and __dirname)
const cwd = process.cwd();
const candidates = [
  path.resolve(cwd, "dist/public"),
  path.resolve(cwd, "public"),
  path.resolve(cwd, "artifacts/nafex-hub/dist/public"),
  path.resolve(__dirname, "../../../artifacts/nafex-hub/dist/public"),
  path.resolve(__dirname, "../../../dist/public"),
  path.resolve(__dirname, "../../nafex-hub/dist/public"),
  path.resolve(__dirname, "../public"),
];
const frontendPath = candidates.find((p) => existsSync(path.join(p, "index.html"))) || candidates[0];

if (existsSync(frontendPath)) {
  logger.info({ frontendPath }, "Serving frontend static assets");

  // Serve static assets
  app.use(express.static(frontendPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("index.html") || filePath.endsWith("sw.js") || filePath.endsWith("registerSW.js")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, private");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    }
  }));

  // SPA fallback for HTML page routing
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    // DO NOT serve index.html for missing static assets (JS, CSS, images, fonts)!
    // Returning index.html for a missing .js file causes "Uncaught SyntaxError: Unexpected token '<'" which renders a blank white page!
    if (req.path.startsWith("/assets/") || /\.(js|css|png|jpg|jpeg|gif|ico|svg|json|woff2?|ttf|eot)$/i.test(req.path)) {
      return res.status(404).send("Asset not found");
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

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(err, "Unhandled error in Express");
  res.status(err.status || 500).json({ 
    error: process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message || "Internal Server Error"
  });
});

export default app;
