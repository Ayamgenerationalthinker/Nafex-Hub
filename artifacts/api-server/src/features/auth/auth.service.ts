import { AuthRepository } from "./auth.repository";
import bcrypt from "bcryptjs";
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
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
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
}
