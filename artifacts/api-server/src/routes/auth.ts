import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { sendAdminEmail, sendVerificationEmail } from "../lib/mailer";
import { requireAuth } from "../lib/auth-middleware";

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
const VERIFICATION_TTL_MS = 3 * 60 * 1000; // 3 minutes

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

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_development_only";

function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: `${TOKEN_EXPIRY_DAYS}d` });
}

export function parseToken(token: string): { userId: number; expiresAt: number } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; exp: number };
    return { userId: decoded.userId, expiresAt: decoded.exp * 1000 };
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
  
  if (!process.env.EMAIL_USER) {
    console.log(`\n======================================================`);
    console.log(`[DEV MODE] Verification code for ${user.email}: ${verificationCode}`);
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
  
  if (!process.env.EMAIL_USER) {
    console.log(`\n======================================================`);
    console.log(`[DEV MODE] Resent Verification code for ${user.email}: ${code}`);
    console.log(`======================================================\n`);
  }
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
    emailVerificationExpiry: user.emailVerificationExpiry,
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

router.post("/auth/google", async (req, res): Promise<void> => {
  const schema = z.object({
    idToken: z.string().optional(),
    accessToken: z.string().optional(),
    role: z.enum(["user", "business_owner"]).optional().default("user")
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { idToken, accessToken, role } = parsed.data;

  try {
    let email: string | undefined;
    let name: string | undefined;

    if (accessToken) {
      const googleRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${encodeURIComponent(accessToken)}`);
      if (!googleRes.ok) {
        res.status(400).json({ error: "Failed to verify Google access token" });
        return;
      }
      const userInfo = (await googleRes.json()) as {
        email?: string;
        name?: string;
      };
      email = userInfo.email;
      name = userInfo.name;
    } else if (idToken) {
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      if (!googleRes.ok) {
        res.status(400).json({ error: "Failed to verify Google ID token" });
        return;
      }
      const tokenInfo = (await googleRes.json()) as {
        email?: string;
        name?: string;
      };
      email = tokenInfo.email;
      name = tokenInfo.name;
    } else {
      res.status(400).json({ error: "Either idToken or accessToken is required" });
      return;
    }

    if (!email) {
      res.status(400).json({ error: "Google verification did not return an email" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const finalName = name || normalizedEmail.split("@")[0] || "Google User";

    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));

    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString("hex");
      const hashedPassword = await hashPassword(randomPassword);

      [user] = await db
        .insert(usersTable)
        .values({
          name: finalName,
          email: normalizedEmail,
          password: hashedPassword,
          role,
          emailVerified: true,
        })
        .returning();
      
      sendAdminEmail(
        "New Google User Signup",
        `A new user has registered on Nafex Hub via Google.\n\nName: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}\nDate: ${new Date().toUTCString()}`
      );
    }

    const appToken = generateToken(user.id);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      token: appToken,
    });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ error: "Internal server error during Google authentication" });
  }
});

router.post("/auth/facebook", async (req, res): Promise<void> => {
  const schema = z.object({
    accessToken: z.string().min(1, "accessToken is required"),
    role: z.enum(["user", "business_owner"]).optional().default("user")
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { accessToken, role } = parsed.data;

  try {
    const fbRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`);
    if (!fbRes.ok) {
      res.status(400).json({ error: "Failed to verify Facebook token" });
      return;
    }
    const tokenInfo = (await fbRes.json()) as {
      id?: string;
      email?: string;
      name?: string;
    };

    if (!tokenInfo.email) {
      res.status(400).json({ error: "Facebook account did not return an email address" });
      return;
    }

    const email = tokenInfo.email.toLowerCase().trim();
    const name = tokenInfo.name || email.split("@")[0] || "Facebook User";

    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString("hex");
      const hashedPassword = await hashPassword(randomPassword);

      [user] = await db
        .insert(usersTable)
        .values({
          name,
          email,
          password: hashedPassword,
          role,
          emailVerified: true,
        })
        .returning();
      
      sendAdminEmail(
        "New Facebook User Signup",
        `A new user has registered on Nafex Hub via Facebook.\n\nName: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}\nDate: ${new Date().toUTCString()}`
      );
    }

    const appToken = generateToken(user.id);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      token: appToken,
    });
  } catch (err) {
    console.error("Facebook auth error:", err);
    res.status(500).json({ error: "Internal server error during Facebook authentication" });
  }
});

export default router;
