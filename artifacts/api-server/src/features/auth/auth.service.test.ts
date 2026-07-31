import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { ValidationError, UnauthorizedError, ForbiddenError } from '../../shared/errors/AppError';
import argon2 from 'argon2';

// Mock the AuthRepository completely
vi.mock('./auth.repository', () => {
  return {
    AuthRepository: class {
      findByEmail = vi.fn();
      findById = vi.fn();
      createUser = vi.fn();
      updateUser = vi.fn();
    }
  };
});

describe('AuthService', () => {
  let authService: AuthService;
  let mockRepository: Mocked<AuthRepository>;

  beforeEach(() => {
    mockRepository = new AuthRepository() as unknown as Mocked<AuthRepository>;
    authService = new AuthService(mockRepository);
    vi.clearAllMocks();
  });

  describe('Password Validation', () => {
    it('should throw ValidationError if password is too short', () => {
      expect(() => authService.validatePasswordStrength('Short1!')).toThrow(ValidationError);
      expect(() => authService.validatePasswordStrength('Short1!')).toThrow('Password must be at least 8 characters');
    });

    it('should throw ValidationError if password has no uppercase letter', () => {
      expect(() => authService.validatePasswordStrength('lowercase123!')).toThrow(ValidationError);
      expect(() => authService.validatePasswordStrength('lowercase123!')).toThrow('Password must contain at least one uppercase letter');
    });

    it('should throw ValidationError if password has no number', () => {
      expect(() => authService.validatePasswordStrength('NoNumbersHere!')).toThrow(ValidationError);
      expect(() => authService.validatePasswordStrength('NoNumbersHere!')).toThrow('Password must contain at least one number');
    });

    it('should not throw if password is valid', () => {
      expect(() => authService.validatePasswordStrength('ValidPass123!')).not.toThrow();
    });
  });

  describe('Password Hashing', () => {
    it('should hash and verify passwords using argon2 correctly', async () => {
      const password = 'MySecurePassword123';
      const hash = await authService.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      
      const isValid = await authService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await authService.verifyPassword('WrongPassword123', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('Account Creation', () => {
    it('should throw ValidationError if email is already taken', async () => {
      mockRepository.findByEmail.mockResolvedValueOnce({ id: 1, email: 'test@example.com' } as any);

      await expect(
        authService.createAccount({
          name: 'Test User',
          email: 'test@example.com',
          password: 'ValidPassword123',
          role: 'user'
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ForbiddenError if trying to register as admin', async () => {
      mockRepository.findByEmail.mockResolvedValueOnce(undefined as any);

      await expect(
        authService.createAccount({
          name: 'Test User',
          email: 'test@example.com',
          password: 'ValidPassword123',
          role: 'admin'
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should successfully create an account if input is valid', async () => {
      mockRepository.findByEmail.mockResolvedValueOnce(undefined as any);
      mockRepository.createUser.mockResolvedValueOnce({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'user'
      } as any);

      const result = await authService.createAccount({
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPassword123',
        role: 'user'
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe('test@example.com');
      expect(mockRepository.createUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('Login', () => {
    it('should throw UnauthorizedError if user does not exist', async () => {
      mockRepository.findByEmail.mockResolvedValueOnce(undefined as any);

      await expect(
        authService.login({ email: 'nonexistent@example.com', password: 'ValidPassword123' })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError if password does not match', async () => {
      const mockHash = await argon2.hash('RealPassword123');
      mockRepository.findByEmail.mockResolvedValueOnce({
        id: 1,
        email: 'test@example.com',
        password: mockHash,
      } as any);

      await expect(
        authService.login({ email: 'test@example.com', password: 'WrongPassword123' })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should return user and token if credentials are valid', async () => {
      const mockHash = await argon2.hash('RealPassword123');
      mockRepository.findByEmail.mockResolvedValueOnce({
        id: 1,
        email: 'test@example.com',
        password: mockHash,
        name: 'Test',
        role: 'user'
      } as any);

      const result = await authService.login({ email: 'test@example.com', password: 'RealPassword123' });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe('test@example.com');
    });
  });
});
