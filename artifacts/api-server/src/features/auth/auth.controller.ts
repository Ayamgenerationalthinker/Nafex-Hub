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
    ).catch(e => console.error("Admin email failed:", e));

    sendVerificationEmail(user.email, user.name, user.emailVerificationCode).catch(e => console.error("Verification email failed:", e));
    
    if (env.NODE_ENV !== "production") {
      console.log(`\n======================================================`);
      console.log(`[DEV MODE] Verification code for ${user.email}: ${user.emailVerificationCode}`);
      console.log(`======================================================\n`);
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
}
