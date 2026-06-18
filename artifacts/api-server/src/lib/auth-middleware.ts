import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { parseToken } from "../routes/auth";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
};

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
  user?: AuthUser;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  let token: string | undefined;
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
    res.status(401).json({ error: "Invalid or expired token. Please log in again." });
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

  req.userId = user.id;
  req.userRole = user.role;
  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
  };
  next();
}

/**
 * Require an authenticated user whose email has been verified. Run AFTER `requireAuth`.
 * Returns 403 with a machine-readable code so the frontend can route to /verify-email.
 */
export function requireVerified(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!req.user.emailVerified) {
    res.status(403).json({
      error: "Please verify your email before continuing.",
      code: "EMAIL_NOT_VERIFIED",
    });
    return;
  }
  next();
}

export function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const parsed = parseToken(token);
    if (parsed) req.userId = parsed.userId;
  }
  next();
}