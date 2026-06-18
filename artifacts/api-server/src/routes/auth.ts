import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { sendAdminEmail, sendVerificationEmail } from "../lib/mailer";
import { requireAuth, type AuthRequest } from "../lib/auth-middleware";
import jwt from "jsonwebtoken";
import { validateBody } from "../lib/validation";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import middleware from "i18next-http-middleware";

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
const VERIFICATION_TTL_MS = 60 * 1000; // 1 minute

const router: IRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY_DAYS = 7;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  return null;
}

function generateToken(userId: number): string {
  const payload = { userId };
  const secret = process.env.JWT_SECRET || "dev-secret";
  return jwt.sign(payload, secret, { expiresIn: `${TOKEN_EXPIRY_DAYS}d` });
}

export function parseToken(token: string): { userId: number } | null {
  try {
    const secret = process.env.JWT_SECRET || "dev-secret";
    const decoded = jwt.verify(token, secret) as { userId: number };
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}

// Register
router.post(
  "/auth/register",
  authLimiter,
  validateBody(RegisterBody),
  async (req, res) => {
    const { name, email, password, role } = (req as any).validatedBody;

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      res.status(400).json({ error: passwordError });
      return;
    }

    if (role === "admin") {
      res.status(403).json({ error: "Admin accounts cannot be created through registration" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
    if (existing.length > 0) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }

    const hashedPassword = await hashPassword(password);
    const verificationCode = generateVerificationCode();
    const verificationExpiry = new Date(Date.now() + VERIFICATION_TTL_MS);

    const [user] = await db
      .insert(usersTable)
      .values({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: role ?? "user",
        emailVerified: false,
        emailVerificationCode: verificationCode,
        emailVerificationExpiry: verificationExpiry,
      })
      .returning();

    const token = generateToken(user.id);

    sendAdminEmail(
      "New User Signup",
      `A new user has registered on Nafex Hub.\n\nName: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}\nDate: ${new Date().toUTCString()}`
    );

    sendVerificationEmail(user.email, user.name, verificationCode).catch(() => {});

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });
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
);

// Verify email
router.post(
  "/auth/verify-email",
  authLimiter,
  requireAuth,
  validateBody(z.object({ code: z.string().regex(/^\d{6}$/, "Code must be 6 digits") })),
  async (req: AuthRequest, res) => {
    const { code } = (req as any).validatedBody;
    const userId = req.userId!;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (user.emailVerified) {
      res.json({ message: "Email already verified", emailVerified: true });
      return;
    }
    if (!user.emailVerificationCode || !user.emailVerificationExpiry) {
      res.status(400).json({ error: "No pending verification. Request a new code." });
      return;
    }
    if (user.emailVerificationExpiry.getTime() < Date.now()) {
      res.status(400).json({ error: "Code has expired. Request a new one." });
      return;
    }
    if (user.emailVerificationCode !== parsed.data.code) {
      res.status(400).json({ error: "Incorrect code" });
      return;
    }
    await db
      .update(usersTable)
      .set({ emailVerified: true, emailVerificationCode: null, emailVerificationExpiry: null })
      .where(eq(usersTable.id, userId));
    res.json({ message: "Email verified", emailVerified: true });
  }
);

// Resend verification
router.post(
  "/auth/resend-verification",
  authLimiter,
  requireAuth,
  async (req: AuthRequest, res) => {
    const userId = req.userId!;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (user.emailVerified) {
      res.json({ message: "Already verified" });
      return;
    }
    const code = generateVerificationCode();
    const expiry = new Date(Date.now() + VERIFICATION_TTL_MS);
    await db
      .update(usersTable)
      .set({ emailVerificationCode: code, emailVerificationExpiry: expiry })
      .where(eq(usersTable.id, userId));
    const delivered = await sendVerificationEmail(user.email, user.name, code);
    res.json({
      message: delivered
        ? "Verification code sent. Check your email."
        : "Code generated but email delivery is not configured on the server.",
      delivered,
    });
  }
);

// Login
router.post(
  "/auth/login",
  authLimiter,
  validateBody(LoginBody),
  async (req, res) => {
    const { email, password } = (req as any).validatedBody;
    const normalizedEmail = email.toLowerCase().trim();
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail));
    const passwordValid = user ? await verifyPassword(password, user.password) : false;
    if (!user || !passwordValid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const token = generateToken(user.id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });
    res.json({
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
);

// Get current user
router.get(
  "/auth/me",
  async (req, res) => {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const parsed = parseToken(token);
    if (!parsed) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parsed.userId));
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    });
  }
);

// Update profile
router.patch(
  "/auth/profile",
  requireAuth,
  validateBody(z.object({ name: z.string().min(1).max(100) })),
  async (req: AuthRequest, res) => {
    const { name } = (req as any).validatedBody;
    const userId = req.userId!;
    const [updated] = await db
      .update(usersTable)
      .set({ name })
      .where(eq(usersTable.id, userId))
      .returning();
    res.json({ id: updated.id, name: updated.name, email: updated.email, role: updated.role, createdAt: updated.createdAt });
  }
);

// Change password
router.patch(
  "/auth/password",
  requireAuth,
  validateBody(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) })),
  async (req: AuthRequest, res) => {
    const { currentPassword, newPassword } = (req as any).validatedBody;
    const userId = req.userId!;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }
    const strengthErr = validatePasswordStrength(newPassword);
    if (strengthErr) {
      res.status(400).json({ error: strengthErr });
      return;
    }
    const hashed = await hashPassword(newPassword);
    await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, userId));
    res.json({ message: "Password changed successfully" });
  }
);

// Delete account
router.delete(
  "/auth/account",
  requireAuth,
  async (req: AuthRequest, res) => {
    const userId = req.userId!;
    await db.delete(usersTable).where(eq(usersTable.id, userId));
    res.json({ message: "Account deleted" });
  }
);

export default router;
