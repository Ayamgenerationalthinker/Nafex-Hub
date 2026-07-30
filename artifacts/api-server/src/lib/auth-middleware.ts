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
  console.log("[AUTH] requireAuth check for", req.path, "Header:", authHeader ? authHeader.slice(0, 20) + "..." : "MISSING");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
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
 * Email verification requirement is permanently disabled.
 * All authenticated users can access protected routes regardless of email verification status.
 */
export function requireVerified(
  _req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
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