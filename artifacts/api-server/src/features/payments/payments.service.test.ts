import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { ForbiddenError, NotFoundError } from '../../shared/errors/AppError';
import { createHmac } from 'crypto';

// Mock the PaymentsRepository completely
vi.mock('./payments.repository', () => {
  return {
    PaymentsRepository: class {
      getBusinessById = vi.fn();
      getBusinessByOwnerId = vi.fn();
      getOrderById = vi.fn();
      updateOrderPaymentStatus = vi.fn();
      updateOrderSubStatus = vi.fn();
      saveTransaction = vi.fn();
      clearCart = vi.fn();
    }
  };
});

describe('PaymentsService', () => {
  let paymentsService: PaymentsService;
  let mockRepository: any;

  beforeEach(async () => {
    // Reset env vars before each test to guarantee PAYSTACK_SECRET is consistent
    process.env.PAYSTACK_SECRET_KEY = 'test_secret_key';
    mockRepository = new (await import('./payments.repository')).PaymentsRepository();
    paymentsService = new PaymentsService(mockRepository);
    vi.clearAllMocks();

    // Mock internal paystackPost to avoid real HTTP requests
    paymentsService.paystackPost = vi.fn();
  });

  describe('Webhook Signature Validation', () => {
    it('should return true for a valid HMAC SHA512 signature', () => {
      const payload = JSON.stringify({ event: 'charge.success' });
      const secret = 'test_secret_key';
      const validSignature = createHmac('sha512', secret).update(payload).digest('hex');

      const isValid = paymentsService.verifyWebhookSignature(payload, validSignature);
      expect(isValid).toBe(true);
    });

    it('should return false for an invalid signature', () => {
      const payload = JSON.stringify({ event: 'charge.success' });
      const invalidSignature = 'invalid_hash_string';

      const isValid = paymentsService.verifyWebhookSignature(payload, invalidSignature);
      expect(isValid).toBe(false);
    });
  });

  describe('Payout Allocations', () => {
    it('should return false if business has no paystackRecipientCode', async () => {
      mockRepository.getBusinessById.mockResolvedValue({ id: 1, paystackRecipientCode: null });
      const result = await paymentsService.payoutToSeller(1, 5000, 100);
      expect(result).toBe(false);
      expect(paymentsService.paystackPost).not.toHaveBeenCalled();
    });

    it('should trigger paystack /transfer if business has recipient code', async () => {
      mockRepository.getBusinessById.mockResolvedValue({ id: 1, paystackRecipientCode: 'RCP_test123' });
      (paymentsService.paystackPost as any).mockResolvedValue({ status: true });

      const result = await paymentsService.payoutToSeller(1, 5000, 100);
      expect(result).toBe(true);
      expect(paymentsService.paystackPost).toHaveBeenCalledWith('/transfer', {
        source: 'balance',
        amount: 5000,
        recipient: 'RCP_test123',
        reason: 'Escrow release for Order #100 from Nafex Hub'
      });
    });
  });

  describe('Initialize Payment', () => {
    it('should throw NotFoundError if order does not exist', async () => {
      mockRepository.getOrderById.mockResolvedValue(null);
      await expect(paymentsService.initializePayment(1, 999)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user does not own the order', async () => {
      mockRepository.getOrderById.mockResolvedValue({ userId: 2 });
      await expect(paymentsService.initializePayment(1, 999)).rejects.toThrow(ForbiddenError);
    });
  });
});
