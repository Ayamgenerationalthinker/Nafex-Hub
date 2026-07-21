import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";
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
  const domains = process.env["REPLIT_DOMAINS"];
  if (domains) return domains.split(",").map((d) => `https://${d.trim()}`);
  return ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];
})();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Allow Paystack, Google, and Facebook SDKs from their official CDNs.
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.paystack.co", "https://accounts.google.com", "https://connect.facebook.net", "https://www.facebook.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      // Allow WebSocket connections, Paystack API, Google, and Facebook identity validation calls
      connectSrc: ["'self'", "ws:", "wss:", "https://api.paystack.co", "https://checkout.paystack.com", "https://accounts.google.com", "https://graph.facebook.com", "https://www.facebook.com"],
      frameSrc: ["'self'", "https://checkout.paystack.com", "https://accounts.google.com", "https://www.facebook.com", "https://web.facebook.com"],
    },
  },
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
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
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

if (process.env["NODE_ENV"] === "production") {
  const frontendPath = path.resolve(__dirname, "../../../artifacts/nafex-hub/dist/public");
  app.use(express.static(frontendPath));
  app.get("*path", (_req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
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
