import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../../lib/auth-middleware";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";

export const authRepository = new AuthRepository();
export const authService = new AuthService(authRepository);
export const authController = new AuthController(authService);

const router: IRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/auth/register", authLimiter, (req, res, next) => {
  authController.register(req, res).catch(next);
});

router.post("/auth/login", authLimiter, (req, res, next) => {
  authController.login(req, res).catch(next);
});

router.post("/auth/google", authLimiter, (req, res, next) => {
  authController.googleLogin(req, res).catch(next);
});

router.post("/auth/facebook", authLimiter, (req, res, next) => {
  authController.facebookLogin(req, res).catch(next);
});

router.post("/auth/verify-email", authLimiter, requireAuth, (req, res, next) => {
  authController.verifyEmail(req, res).catch(next);
});

router.post("/auth/resend-verification", authLimiter, requireAuth, (req, res, next) => {
  authController.resendVerification(req, res).catch(next);
});

router.get("/auth/me", (req, res, next) => {
  authController.me(req, res).catch(next);
});

router.patch("/auth/profile", requireAuth, (req, res, next) => {
  authController.updateProfile(req, res).catch(next);
});

router.patch("/auth/password", requireAuth, (req, res, next) => {
  authController.updatePassword(req, res).catch(next);
});

export default router;
