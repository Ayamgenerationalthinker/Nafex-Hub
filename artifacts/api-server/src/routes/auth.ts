import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { sendAdminEmail, sendVerificationEmail } from "../lib/mailer";
import { requireAuth } from "../lib/auth-middleware";

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
  const expiresAt = Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  const random = crypto.randomBytes(16).toString("hex");
  const payload = `${userId}:${expiresAt}:${random}`;
  return Buffer.from(payload).toString("base64");
}

export function parseToken(token: string): { userId: number; expiresAt: number } | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length < 2) return null;
    const userId = parseInt(parts[0], 10);
    const expiresAt = parseInt(parts[1], 10);
    if (isNaN(userId) || isNaN(expiresAt)) return null;
    if (Date.now() > expiresAt) return null;
    return { userId, expiresAt };
  } catch {
    return null;
  }
}

router.post("/auth/register", authLimiter, async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password, role } = parsed.data;

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

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

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
      role: normalizedEmail === "princefiebor10@gmail.com" ? "admin" : (role ?? "user"),
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

  // Fire-and-forget verification email; user is still logged in either way.
  sendVerificationEmail(user.email, user.name, verificationCode).catch(() => {});

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
});

// Verify email with 6-digit code emailed at signup. Rate-limited to deter brute force.
router.post("/auth/verify-email", authLimiter, requireAuth, async (req, res): Promise<void> => {
  const schema = z.object({ code: z.string().regex(/^\d{6}$/, "Code must be 6 digits") });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid code" });
    return;
  }
  const userId = (req as { user?: { id: number } }).user!.id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (user.emailVerified) { res.json({ message: "Email already verified", emailVerified: true }); return; }
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
});

// Resend verification code (rate-limited).
router.post("/auth/resend-verification", authLimiter, requireAuth, async (req, res): Promise<void> => {
  const userId = (req as { user?: { id: number } }).user!.id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (user.emailVerified) { res.json({ message: "Already verified" }); return; }
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
});

router.post("/auth/login", authLimiter, async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  const passwordValid = user ? await verifyPassword(password, user.password) : false;

  if (!user || !passwordValid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Force admin role for this specific email
  if (normalizedEmail === "princefiebor10@gmail.com" && user.role !== "admin") {
    const [updated] = await db
      .update(usersTable)
      .set({ role: "admin" })
      .where(eq(usersTable.id, user.id))
      .returning();
    user = updated;
  }

  const token = generateToken(user.id);

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
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const parsed = parseToken(token);

  if (!parsed) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, parsed.userId));

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
    loyaltyPoints: user.loyaltyPoints,
    createdAt: user.createdAt,
  });
});

router.patch("/auth/profile", requireAuth, async (req, res): Promise<void> => {
  const schema = z.object({ name: z.string().min(1).max(100) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const userId = (req as { user?: { id: number } }).user!.id;
  const [updated] = await db
    .update(usersTable)
    .set({ name: parsed.data.name })
    .where(eq(usersTable.id, userId))
    .returning();
  res.json({ id: updated.id, name: updated.name, email: updated.email, role: updated.role, createdAt: updated.createdAt });
});

router.patch("/auth/password", requireAuth, async (req, res): Promise<void> => {
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const userId = (req as { user?: { id: number } }).user!.id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const valid = await verifyPassword(parsed.data.currentPassword, user.password);
  if (!valid) { res.status(400).json({ error: "Current password is incorrect" }); return; }
  const strengthErr = validatePasswordStrength(parsed.data.newPassword);
  if (strengthErr) { res.status(400).json({ error: strengthErr }); return; }
  const hashed = await hashPassword(parsed.data.newPassword);
  await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, userId));
  res.json({ message: "Password changed successfully" });
});

router.delete("/auth/account", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as { user?: { id: number } }).user!.id;
  await db.delete(usersTable).where(eq(usersTable.id, userId));
  res.json({ message: "Account deleted" });
});

export default router;
