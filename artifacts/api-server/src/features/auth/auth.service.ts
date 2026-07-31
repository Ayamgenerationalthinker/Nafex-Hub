import { AuthRepository } from "./auth.repository";
import bcrypt from "bcryptjs";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../../config/env";
import { ValidationError, UnauthorizedError, ForbiddenError, AppError } from "../../shared/errors/AppError";

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY_DAYS = 7;
const VERIFICATION_TTL_MS = 3 * 60 * 1000;

export class AuthService {
  private repository: AuthRepository;

  constructor(repository: AuthRepository) {
    this.repository = repository;
  }

  public generateVerificationCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  public async hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }

  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
      return bcrypt.compare(password, hash);
    }
    return argon2.verify(hash, password);
  }

  public validatePasswordStrength(password: string): void {
    if (password.length < 8) throw new ValidationError("Password must be at least 8 characters");
    if (!/[A-Z]/.test(password)) throw new ValidationError("Password must contain at least one uppercase letter");
    if (!/[0-9]/.test(password)) throw new ValidationError("Password must contain at least one number");
  }

  public generateToken(userId: number): string {
    return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: `${TOKEN_EXPIRY_DAYS}d` });
  }

  public parseToken(token: string): { userId: number; expiresAt: number } | null {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: number; exp: number };
      return { userId: decoded.userId, expiresAt: decoded.exp * 1000 };
    } catch {
      return null;
    }
  }

  public async checkEmailAvailable(email: string): Promise<void> {
    const existing = await this.repository.findByEmail(email);
    if (existing) {
      throw new ValidationError("Email already registered");
    }
  }

  public async createAccount(data: any): Promise<any> {
    const { name, email, password, role } = data;
    this.validatePasswordStrength(password);
    
    if (role === "admin") {
      throw new ForbiddenError("Admin accounts cannot be created through registration");
    }

    const normalizedEmail = email.toLowerCase().trim();
    await this.checkEmailAvailable(normalizedEmail);

    const hashedPassword = await this.hashPassword(password);
    const verificationCode = this.generateVerificationCode();
    const verificationExpiry = new Date(Date.now() + VERIFICATION_TTL_MS);

    const userRole = normalizedEmail === "princefiebor10@gmail.com" ? "admin" : (role ?? "user");

    const user = await this.repository.createUser({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: userRole,
      emailVerified: false,
      emailVerificationCode: verificationCode,
      emailVerificationExpiry: verificationExpiry,
    });

    return { user, token: this.generateToken(user.id) };
  }

  public async login(data: any): Promise<any> {
    const { email, password } = data;
    const normalizedEmail = email.toLowerCase().trim();

    let user = await this.repository.findByEmail(normalizedEmail);
    if (!user) throw new UnauthorizedError("Invalid email or password");

    const passwordValid = await this.verifyPassword(password, user.password);
    if (!passwordValid) throw new UnauthorizedError("Invalid email or password");

    // Force admin role check
    if (normalizedEmail === "princefiebor10@gmail.com" && user.role !== "admin") {
      await this.repository.updateVerification(user.id, { role: "admin" });
      user.role = "admin";
    }

    return { user, token: this.generateToken(user.id) };
  }

  public async loginWithGoogle(idToken: string): Promise<any> {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!res.ok) throw new UnauthorizedError("Invalid Google token");
    const payload = (await res.json()) as any;
    
    // Verify client ID (audience) if we have one configured, otherwise just trust the token
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    if (clientId && payload.aud !== clientId) {
      throw new UnauthorizedError("Google token audience mismatch");
    }

    const email = payload.email.toLowerCase().trim();
    const name = payload.name || "Google User";
    const googleId = payload.sub;

    let user = await this.repository.findByEmail(email);
    if (user) {
      if (!user.googleId) {
        await this.repository.updateVerification(user.id, { googleId, emailVerified: true });
        user.googleId = googleId;
        user.emailVerified = true;
      }
    } else {
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await this.hashPassword(randomPassword);
      const userRole = email === "princefiebor10@gmail.com" ? "admin" : "user";
      
      user = await this.repository.createUser({
        name,
        email,
        password: hashedPassword,
        role: userRole,
        googleId,
        emailVerified: true,
      });
    }

    // Force admin check
    if (email === "princefiebor10@gmail.com" && user.role !== "admin") {
      await this.repository.updateVerification(user.id, { role: "admin" });
      user.role = "admin";
    }

    return { user, token: this.generateToken(user.id) };
  }

  public async loginWithFacebook(accessToken: string): Promise<any> {
    const res = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`);
    if (!res.ok) throw new UnauthorizedError("Invalid Facebook token");
    const payload = (await res.json()) as any;

    if (!payload.email) {
      throw new UnauthorizedError("Facebook account must have an email attached");
    }

    const email = payload.email.toLowerCase().trim();
    const name = payload.name || "Facebook User";
    const facebookId = payload.id;

    let user = await this.repository.findByEmail(email);
    if (user) {
      if (!user.facebookId) {
        await this.repository.updateVerification(user.id, { facebookId, emailVerified: true });
        user.facebookId = facebookId;
        user.emailVerified = true;
      }
    } else {
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await this.hashPassword(randomPassword);
      const userRole = email === "princefiebor10@gmail.com" ? "admin" : "user";
      
      user = await this.repository.createUser({
        name,
        email,
        password: hashedPassword,
        role: userRole,
        facebookId,
        emailVerified: true,
      });
    }

    // Force admin check
    if (email === "princefiebor10@gmail.com" && user.role !== "admin") {
      await this.repository.updateVerification(user.id, { role: "admin" });
      user.role = "admin";
    }

    return { user, token: this.generateToken(user.id) };
  }

  public async verifyEmail(userId: number, code: string): Promise<void> {
    const user = await this.repository.findById(userId);
    if (!user) throw new UnauthorizedError("User not found");
    if (user.emailVerified) throw new ValidationError("Email already verified");
    if (!user.emailVerificationCode || !user.emailVerificationExpiry) {
      throw new ValidationError("No pending verification. Request a new code.");
    }
    if (user.emailVerificationExpiry.getTime() < Date.now()) {
      throw new ValidationError("Code has expired. Request a new one.");
    }
    if (user.emailVerificationCode !== code) {
      throw new ValidationError("Incorrect code");
    }
    await this.repository.updateVerification(userId, { 
      emailVerified: true, 
      emailVerificationCode: null, 
      emailVerificationExpiry: null 
    });
  }

  public async resendVerification(userId: number): Promise<{ code: string; email: string; name: string }> {
    const user = await this.repository.findById(userId);
    if (!user) throw new UnauthorizedError("User not found");
    if (user.emailVerified) throw new ValidationError("Already verified");
    
    const code = this.generateVerificationCode();
    const expiry = new Date(Date.now() + VERIFICATION_TTL_MS);
    await this.repository.updateVerification(userId, {
      emailVerificationCode: code,
      emailVerificationExpiry: expiry
    });
    
    return { code, email: user.email, name: user.name };
  }

  public async getProfile(userId: number): Promise<any> {
    const user = await this.repository.findById(userId);
    if (!user) throw new UnauthorizedError("User not found");
    return user;
  }

  public async updateProfile(userId: number, name: string): Promise<any> {
    await this.repository.updateVerification(userId, { name });
    const user = await this.repository.findById(userId);
    return user;
  }

  public async updatePassword(userId: number, currentPass: string, newPass: string): Promise<void> {
    const user = await this.repository.findById(userId);
    if (!user) throw new UnauthorizedError("User not found");

    const valid = await this.verifyPassword(currentPass, user.password);
    if (!valid) throw new ValidationError("Incorrect current password");

    this.validatePasswordStrength(newPass);

    const hashed = await this.hashPassword(newPass);
    await this.repository.updatePassword(userId, hashed);
  }
}
