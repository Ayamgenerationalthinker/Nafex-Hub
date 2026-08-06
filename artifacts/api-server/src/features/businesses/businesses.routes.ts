import { Router } from "express";
import { BusinessesController } from "./businesses.controller";
import { BusinessesService } from "./businesses.service";
import { BusinessesRepository } from "./businesses.repository";
import { requireAuth, requireVerified } from "../../lib/auth-middleware";

const businessesRepository = new BusinessesRepository();
const businessesService = new BusinessesService(businessesRepository);
const businessesController = new BusinessesController(businessesService);

const router = Router();

router.get("/businesses", (req, res, next) => {
  businessesController.getBusinesses(req, res).catch(next);
});

router.get("/businesses/featured", (req, res, next) => {
  businessesController.getFeatured(req, res).catch(next);
});

router.get("/businesses/featured-top", (req, res, next) => {
  businessesController.getFeaturedTop(req, res).catch(next);
});

router.get("/businesses/top", (req, res, next) => {
  businessesController.getTop(req, res).catch(next);
});

router.get("/businesses/trending", (req, res, next) => {
  businessesController.getTrending(req, res).catch(next);
});

router.get("/businesses/verified", (req, res, next) => {
  businessesController.getVerified(req, res).catch(next);
});

router.get("/businesses/:id", (req, res, next) => {
  businessesController.getBusinessById(req, res).catch(next);
});

router.post("/businesses", requireAuth, requireVerified, (req, res, next) => {
  businessesController.createBusiness(req as any, res).catch(next);
});

router.put("/businesses/:id", requireAuth, (req, res, next) => {
  businessesController.updateBusiness(req as any, res).catch(next);
});

router.post("/businesses/:id/settlement", requireAuth, (req, res, next) => {
  businessesController.setupSettlement(req as any, res).catch(next);
});

router.delete("/businesses/:id", requireAuth, (req, res, next) => {
  businessesController.deleteBusiness(req as any, res).catch(next);
});

router.delete("/admin/business/:id", requireAuth, (req, res, next) => {
  businessesController.adminDeleteBusiness(req as any, res).catch(next);
});

router.patch("/admin/businesses/:id/featured", requireAuth, (req, res, next) => {
  businessesController.adminFeatureBusiness(req as any, res).catch(next);
});

router.patch("/businesses/:id/verify", requireAuth, (req, res, next) => {
  businessesController.adminVerifyBusiness(req as any, res).catch(next);
});

router.get("/admin/run-migrations", async (req, res) => {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const pg = await import("pg");
    
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL is not set");

    const sslmodeMatch = dbUrl.match(/[?&]sslmode=([^&]+)/i);
    const sslmode = sslmodeMatch?.[1]?.toLowerCase();
    
    let useInsecureSsl = false;
    if (process.env.PG_SSL_INSECURE === "false") {
      useInsecureSsl = false;
    } else if (process.env.PG_SSL_INSECURE === "true") {
      useInsecureSsl = true;
    } else if (sslmode === "disable") {
      useInsecureSsl = false;
    } else if (sslmode) {
      useInsecureSsl = true;
    } else {
      useInsecureSsl = process.env.NODE_ENV === "production";
    }

    const pool = new pg.default.Pool({ 
      connectionString: dbUrl,
      ...(useInsecureSsl ? { ssl: { rejectUnauthorized: false } } : {})
    });
    
    const migrationFile = path.resolve(process.cwd(), "lib/db/migrations/0005_catchup_missing_columns.sql");
    const sql = fs.readFileSync(migrationFile, "utf-8");
    
    await pool.query(sql);
    await pool.end();
    
    res.json({ success: true, message: "Raw migration 0005 applied successfully directly to the database!" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

export default router;
