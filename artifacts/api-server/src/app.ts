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

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
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
  origin: process.env["ALLOWED_ORIGIN"] ?? "http://localhost:5173",
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
