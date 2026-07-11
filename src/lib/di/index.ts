/**
 * Dependency Injection Layer Exports
 * Central point for importing DI infrastructure
 *
 * Import from: '@/lib/di'
 */

// Port interfaces (contracts)
export type {
  IIdempotencyStore,
  ICommissionRepository,
  IWebhookSignatureVerifier,
  AffiliateProfile,
  Commission,
} from './ports';

// Adapters (implementations)
export {
  RedisIdempotencyStore,
  SupabaseCommissionRepository,
  TimingSafeSignatureVerifier,
} from './adapters';

// Container (singleton, service resolution)
export {
  DIContainer,
  setupContainer,
  getService,
  ServiceKeys,
  getIdempotencyStore,
  getCommissionRepository,
  getSignatureVerifier,
} from './container';

// Contract tests (for testing any adapter)
export {
  testIdempotencyStoreContract,
  testCommissionRepositoryContract,
  testWebhookSignatureVerifierContract,
} from './contract-tests';
