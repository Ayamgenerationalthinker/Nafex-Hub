import { Request, Response } from "express";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { AuthService } from "./auth.service";
import { sendAdminEmail, sendVerificationEmail } from "../../lib/mailer";
import { env } from "../../config/env";

export class AuthController {
  private service: AuthService;

  constructor(service: AuthService) {
    this.service = service;
  }

  public async register(req: Request, res: Response): Promise<void> {
    const parsed = RegisterBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { user, token } = await this.service.createAccount(parsed.data);

    sendAdminEmail(
      "New User Signup",
      `A new user has registered on Nafex Hub.\n\nName: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}\nDate: ${new Date().toUTCString()}`
    ).catch(e => import("../../shared/logger").then(({ logger }) => logger.error({ err: e }, "Admin email failed")));

    sendVerificationEmail(user.email, user.name, user.emailVerificationCode).catch(e => import("../../shared/logger").then(({ logger }) => logger.error({ err: e }, "Verification email failed")));
    
    if (env.NODE_ENV !== "production") {
      import("../../shared/logger").then(({ logger }) => {
        logger.info({ email: user.email, code: user.emailVerificationCode }, "[DEV MODE] Verification code");
      });
    }

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      token,
    });
  }

  public async login(req: Request, res: Response): Promise<void> {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { user, token } = await this.service.login(parsed.data);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        loyaltyPoints: user.loyaltyPoints,
        createdAt: user.createdAt,
      },
      token,
    });
  }

  public async googleLogin(req: Request, res: Response): Promise<void> {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ error: "Missing token" });
      return;
    }
    const { user, token: jwtToken } = await this.service.loginWithGoogle(token);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        loyaltyPoints: user.loyaltyPoints,
        createdAt: user.createdAt,
      },
      token: jwtToken,
    });
  }

  public async facebookLogin(req: Request, res: Response): Promise<void> {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ error: "Missing token" });
      return;
    }
    const { user, token: jwtToken } = await this.service.loginWithFacebook(token);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        loyaltyPoints: user.loyaltyPoints,
        createdAt: user.createdAt,
      },
      token: jwtToken,
    });
  }

  public async verifyEmail(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user!.id;
    const { code } = req.body;
    if (!code || !/^\d{6}$/.test(code)) {
      res.status(400).json({ error: "Code must be 6 digits" });
      return;
    }
    
    await this.service.verifyEmail(userId, code);
    res.json({ message: "Email verified", emailVerified: true });
  }

  public async resendVerification(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user!.id;
    const { code, email, name } = await this.service.resendVerification(userId);
    
    const delivered = await sendVerificationEmail(email, name, code);
    
    if (env.NODE_ENV !== "production") {
      import("../../shared/logger").then(({ logger }) => {
        logger.info({ code, email }, "[DEV MODE] Resent Verification code");
      });
    }

    res.json({
      message: delivered ? "Verification code sent. Check your email." : "Code generated. Sending via browser.",
      delivered,
      email,
      name,
    });
  }

  public async me(req: Request, res: Response): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const token = authHeader.slice(7);
    const parsed = this.service.parseToken(token);
    if (!parsed) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const user = await this.service.getProfile(parsed.userId);
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      emailVerificationExpiry: user.emailVerificationExpiry,
      loyaltyPoints: user.loyaltyPoints,
      createdAt: user.createdAt,
    });
  }

  public async updateProfile(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user!.id;
    const { name } = req.body;
    if (!name || typeof name !== "string" || name.length < 1) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    const user = await this.service.updateProfile(userId, name);
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt });
  }

  public async updatePassword(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user!.id;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "currentPassword and newPassword are required" });
      return;
    }

    await this.service.updatePassword(userId, currentPassword, newPassword);
    res.json({ message: "Password updated successfully" });
  }
}
