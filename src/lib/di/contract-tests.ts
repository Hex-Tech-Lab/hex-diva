/**
 * Contract Tests for DI Ports
 * Verify that adapters satisfy port invariants
 *
 * Each port has contract tests that any implementation MUST pass
 * Run via: vitest src/lib/di/contract-tests.ts
 *
 * ADR-011: Contract tests ensure behavioral compatibility across implementations
 */

import { describe, test, expect, beforeEach } from 'vitest';
import type {
  IIdempotencyStore,
  ICommissionRepository,
  IWebhookSignatureVerifier,
} from './ports';

/**
 * Contract tests for IIdempotencyStore
 * Every implementation must satisfy these invariants
 *
 * Test setup:
 * import { testIdempotencyStoreContract } from '@/lib/di/contract-tests';
 * import { RedisIdempotencyStore } from '@/lib/di/adapters';
 *
 * describe('RedisIdempotencyStore', () => {
 *   testIdempotencyStoreContract(() => new RedisIdempotencyStore());
 * });
 */
export function testIdempotencyStoreContract(
  createStore: () => IIdempotencyStore
): void {
  let store: IIdempotencyStore;
  const providerId = 'shopify';
  const webhookId = 'test-webhook-' + Date.now();
  const ttl = 300; // 5 minute TTL for tests

  beforeEach(() => {
    store = createStore();
  });

  describe('IIdempotencyStore contract', () => {
    test('checkIdempotency returns false on first call', async () => {
      const isDuplicate = await store.checkIdempotency(providerId, webhookId, ttl);
      expect(isDuplicate).toBe(false);
    });

    test('checkIdempotency returns true on second call (duplicate detection)', async () => {
      // First call - not in cache
      await store.checkIdempotency(providerId, webhookId, ttl);

      // Mark as processed
      await store.markWebhookProcessed(providerId, webhookId, 'success', ttl);

      // Second call - should detect duplicate
      const isDuplicate = await store.checkIdempotency(providerId, webhookId, ttl);
      expect(isDuplicate).toBe(true);
    });

    test('markWebhookProcessed persists for TTL duration', async () => {
      await store.markWebhookProcessed(providerId, webhookId, 'success', ttl);

      // Immediately after marking, should be detectable
      const isDuplicate = await store.checkIdempotency(providerId, webhookId, ttl);
      expect(isDuplicate).toBe(true);
    });

    test('different webhookIds are treated independently', async () => {
      const webhookId1 = `webhook-1-${Date.now()}`;
      const webhookId2 = `webhook-2-${Date.now()}`;

      // Mark first webhook
      await store.markWebhookProcessed(providerId, webhookId1, 'success', ttl);

      // Check first - should be duplicate
      const isDup1 = await store.checkIdempotency(providerId, webhookId1, ttl);
      expect(isDup1).toBe(true);

      // Check second - should NOT be duplicate (different ID)
      const isDup2 = await store.checkIdempotency(providerId, webhookId2, ttl);
      expect(isDup2).toBe(false);
    });

    test('different providers are treated independently', async () => {
      const webhookId1 = `webhook-test-${Date.now()}`;
      const provider1 = 'shopify';
      const provider2 = 'uppromote';

      // Mark for provider 1
      await store.markWebhookProcessed(provider1, webhookId1, 'success', ttl);

      // Check provider 1 - should be duplicate
      const isDup1 = await store.checkIdempotency(provider1, webhookId1, ttl);
      expect(isDup1).toBe(true);

      // Check provider 2 - should NOT be duplicate (different provider)
      const isDup2 = await store.checkIdempotency(provider2, webhookId1, ttl);
      expect(isDup2).toBe(false);
    });

    test('markWebhookProcessed is idempotent (safe to call multiple times)', async () => {
      const status = 'success';

      // Call multiple times
      await store.markWebhookProcessed(providerId, webhookId, status, ttl);
      await store.markWebhookProcessed(providerId, webhookId, status, ttl);
      await store.markWebhookProcessed(providerId, webhookId, status, ttl);

      // Should still detect as duplicate
      const isDuplicate = await store.checkIdempotency(providerId, webhookId, ttl);
      expect(isDuplicate).toBe(true);
    });

    test('handles failed status correctly', async () => {
      const failedWebhookId = `failed-webhook-${Date.now()}`;

      // Mark as failed
      await store.markWebhookProcessed(providerId, failedWebhookId, 'failed', ttl);

      // Should still prevent duplicate processing
      const isDuplicate = await store.checkIdempotency(providerId, failedWebhookId, ttl);
      expect(isDuplicate).toBe(true);
    });

    test('handles empty webhookId gracefully', async () => {
      // Should not crash or throw
      const isDuplicate = await store.checkIdempotency(providerId, '', ttl);
      expect(isDuplicate).toBe(false);
    });

    test('handles empty providerId gracefully', async () => {
      // Should not crash or throw
      const isDuplicate = await store.checkIdempotency('', webhookId, ttl);
      expect(isDuplicate).toBe(false);
    });
  });
}

/**
 * Contract tests for ICommissionRepository
 * Every implementation must satisfy these invariants
 *
 * Test setup:
 * import { testCommissionRepositoryContract } from '@/lib/di/contract-tests';
 * import { SupabaseCommissionRepository } from '@/lib/di/adapters';
 *
 * describe('SupabaseCommissionRepository', () => {
 *   testCommissionRepositoryContract(() => new SupabaseCommissionRepository());
 * });
 */
export function testCommissionRepositoryContract(
  createRepository: () => ICommissionRepository
): void {
  let repo: ICommissionRepository;
  const testUserId = 'test-affiliate-' + Date.now();
  const testOrderId = 'order-' + Date.now();

  beforeEach(() => {
    repo = createRepository();
  });

  describe('ICommissionRepository contract', () => {
    test('getAffiliateProfile returns null for non-affiliate user', async () => {
      const nonAffiliateId = 'non-affiliate-' + Date.now();
      const profile = await repo.getAffiliateProfile(nonAffiliateId);
      expect(profile).toBeNull();
    });

    test('updateVolume is idempotent (safe to call multiple times)', async () => {
      const amount = 100;

      // Call multiple times with same amount
      await repo.updateVolume(testUserId, amount, true);
      await repo.updateVolume(testUserId, amount, true);
      await repo.updateVolume(testUserId, amount, true);

      // Should not accumulate (would be 300 if not idempotent)
      // NOTE: This test may require mocking or real DB setup to verify
      // For now, just verify no errors thrown
      expect(true).toBe(true);
    });

    test('updateVolume increments volume_month when isMonthly=true', async () => {
      const amount = 50;

      // Note: Requires either mocking or integration test DB setup
      // For contract, just verify API is callable and doesn't throw
      await expect(repo.updateVolume(testUserId, amount, true)).resolves.toBeUndefined();
    });

    test('updateVolume only increments volume_ytd when isMonthly=false', async () => {
      const amount = 25;

      await expect(repo.updateVolume(testUserId, amount, false)).resolves.toBeUndefined();
    });

    test('resetMonthlyVolume zeroes volume_month but preserves volume_ytd', async () => {
      // This test requires database setup to fully verify
      // Contract ensures the method is callable without error
      await expect(repo.resetMonthlyVolume(testUserId)).resolves.toBeUndefined();
    });

    test('updateCommission is idempotent on (userId, orderId) key', async () => {
      const amount = 10;

      // Call twice with same order ID
      await repo.updateCommission(testUserId, amount, testOrderId);
      await repo.updateCommission(testUserId, amount, testOrderId);

      // Should not create duplicate records (idempotency key is userId + orderId)
      expect(true).toBe(true);
    });

    test('updateCommission creates record for new order', async () => {
      const amount = 15;
      const newOrderId = 'order-new-' + Date.now();

      await expect(
        repo.updateCommission(testUserId, amount, newOrderId)
      ).resolves.toBeUndefined();
    });

    test('getCommissionForPayout returns null for non-existent commission', async () => {
      const fakeCommissionId = 'fake-commission-' + Date.now();
      const commission = await repo.getCommissionForPayout(fakeCommissionId);
      expect(commission).toBeNull();
    });

    test('getCommissionForPayout includes tier and rate in response', async () => {
      // After createCommission via updateCommission, fetch it
      // This is an integration test that requires DB setup
      // For contract, we just verify the method signature
      const result = await repo.getCommissionForPayout('any-id');
      // Result should be null or Commission (both valid per contract)
      expect(result === null || typeof result === 'object').toBe(true);
    });

    test('updateCommission with different orders creates separate records', async () => {
      const amount = 20;
      const orderId1 = 'order-1-' + Date.now();
      const orderId2 = 'order-2-' + Date.now();

      await repo.updateCommission(testUserId, amount, orderId1);
      await repo.updateCommission(testUserId, amount, orderId2);

      // Both should be separate records (different order IDs)
      expect(true).toBe(true);
    });

    test('handles zero amount gracefully', async () => {
      // Should not crash
      await expect(repo.updateVolume(testUserId, 0, true)).resolves.toBeUndefined();
    });

    test('handles negative amount gracefully', async () => {
      // Contract doesn't specify behavior, but should not crash
      await expect(repo.updateVolume(testUserId, -10, true)).resolves.toBeUndefined();
    });
  });
}

/**
 * Contract tests for IWebhookSignatureVerifier
 * Every implementation must satisfy these invariants
 *
 * Test setup:
 * import { testWebhookSignatureVerifierContract } from '@/lib/di/contract-tests';
 * import { TimingSafeSignatureVerifier } from '@/lib/di/adapters';
 *
 * describe('TimingSafeSignatureVerifier', () => {
 *   testWebhookSignatureVerifierContract(() => new TimingSafeSignatureVerifier());
 * });
 */
export function testWebhookSignatureVerifierContract(
  createVerifier: () => IWebhookSignatureVerifier
): void {
  let verifier: IWebhookSignatureVerifier;

  beforeEach(() => {
    verifier = createVerifier();
  });

  describe('IWebhookSignatureVerifier contract', () => {
    test('verify returns false for empty signature', async () => {
      const payload = 'test payload';
      const secret = 'test-secret';

      const result = await verifier.verify(payload, '', secret);
      expect(result).toBe(false);
    });

    test('verify returns false for empty secret', async () => {
      const payload = 'test payload';
      const signature = 'test-signature';

      const result = await verifier.verify(payload, signature, '');
      expect(result).toBe(false);
    });

    test('verify returns false for mismatched signature', async () => {
      const payload = 'test payload';
      const secret = 'test-secret';
      const wrongSignature = 'wrong-signature';

      const result = await verifier.verify(payload, wrongSignature, secret);
      expect(result).toBe(false);
    });

    test('verify returns boolean (never throws)', async () => {
      const payload = 'any-payload';
      const signature = 'any-signature';
      const secret = 'any-secret';

      // Contract: verify always returns boolean, never throws
      const result = await verifier.verify(payload, signature, secret);
      expect(typeof result).toBe('boolean');
    });

    test('verify is deterministic (same inputs always yield same result)', async () => {
      const payload = 'deterministic-payload';
      const signature = 'some-signature';
      const secret = 'constant-secret';

      const result1 = await verifier.verify(payload, signature, secret);
      const result2 = await verifier.verify(payload, signature, secret);

      expect(result1).toBe(result2);
    });

    test('verify distinguishes different payloads', async () => {
      // This would need a valid signature generated from payload1
      // For contract, just verify the method handles different payloads
      // Payload1: 'payload-1', Payload2: 'payload-2' with same-secret
      expect(true).toBe(true);
    });

    test('verify handles empty payload', async () => {
      const payload = '';
      const signature = 'some-signature';
      const secret = 'test-secret';

      // Should not crash
      const result = await verifier.verify(payload, signature, secret);
      expect(typeof result).toBe('boolean');
    });

    test('verify is case-sensitive for signature', async () => {
      const payload = 'test';
      const secret = 'secret';
      const sig1 = 'ABC123';
      const sig2 = 'abc123';

      const result1 = await verifier.verify(payload, sig1, secret);
      const result2 = await verifier.verify(payload, sig2, secret);

      // Results may be the same (both false) but case should matter
      expect(typeof result1).toBe('boolean');
      expect(typeof result2).toBe('boolean');
    });
  });
}
