import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
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
      // Allow Paystack inline popup script from their official CDN.
      // SRI cannot be pinned because Paystack updates the file in-place.
      // The domain allowlist in script-src mitigates supply-chain risk.
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.paystack.co"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      // Allow WebSocket connections and Paystack API calls from the browser
      connectSrc: ["'self'", "ws:", "wss:", "https://api.paystack.co", "https://checkout.paystack.com"],
      frameSrc: ["'self'", "https://checkout.paystack.com"],
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
  origin: (origin, cb) => {
    // Allow same-origin requests (no Origin header) and health-check tools
    if (!origin) return cb(null, true);
    // Allow if explicitly set via env var (production)
    const explicitOrigin = process.env["ALLOWED_ORIGIN"];
    if (explicitOrigin && origin === explicitOrigin) return cb(null, true);
    // Allow any Replit preview/production domain
    const replitDomains = process.env["REPLIT_DOMAINS"]?.split(",") ?? [];
    if (replitDomains.some((d) => origin === `https://${d.trim()}`)) return cb(null, true);
    // Allow localhost in development
    if (process.env["NODE_ENV"] !== "production" && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      return cb(null, true);
    }
    cb(new Error(`CORS: origin '${origin}' not allowed`));
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

export default app;
