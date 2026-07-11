/**
 * Centralized Dependency Injection Container
 * Singleton pattern for service registration and resolution
 *
 * Bootstrap process:
 * 1. Call setupContainer() once at app startup
 * 2. Container resolves services on-demand
 * 3. All services are singletons (instantiated once)
 *
 * ADR-011: DI Container enables testability and loose coupling
 */

import type {
  IIdempotencyStore,
  ICommissionRepository,
  IWebhookSignatureVerifier,
} from './ports';
import {
  RedisIdempotencyStore,
  SupabaseCommissionRepository,
  TimingSafeSignatureVerifier,
} from './adapters';

export class DIContainer {
  private static instance: DIContainer | null = null;
  private services: Map<string, any> = new Map();

  /**
   * Get singleton instance
   * @returns Global DIContainer instance
   */
  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * Register a service factory
   * @param key - Service key (e.g., 'idempotencyStore')
   * @param factory - Factory function that returns service instance
   *
   * Lazily instantiates on first resolve() call
   */
  register(key: string, factory: () => any): void {
    this.services.set(key, { factory, instance: null });
  }

  /**
   * Resolve a service (lazy instantiation)
   * @param key - Service key to resolve
   * @returns Service instance
   *
   * On first call: invokes factory, caches instance, returns instance
   * On subsequent calls: returns cached instance
   *
   * @throws Error if service not registered
   */
  resolve<T = any>(key: string): T {
    const serviceEntry = this.services.get(key);

    if (!serviceEntry) {
      throw new Error(`Service not registered: ${key}`);
    }

    // Lazy instantiation with singleton caching
    if (serviceEntry.instance === null) {
      serviceEntry.instance = serviceEntry.factory();
    }

    return serviceEntry.instance as T;
  }

  /**
   * Clear all services (for testing)
   */
  reset(): void {
    this.services.clear();
  }
}

/**
 * Bootstrap container with all production services
 * Call once at application startup (e.g., in middleware or pages/_app)
 *
 * @returns Configured DIContainer instance
 */
export function setupContainer(): DIContainer {
  const container = DIContainer.getInstance();

  // Register core infrastructure services
  container.register('idempotencyStore', () => new RedisIdempotencyStore());
  container.register('commissionRepository', () => new SupabaseCommissionRepository());
  container.register('signatureVerifier', () => new TimingSafeSignatureVerifier());

  return container;
}

/**
 * Helper function to get services from container
 * Convenience wrapper for common use case
 *
 * @example
 * const store = getService<IIdempotencyStore>('idempotencyStore');
 */
export function getService<T>(key: string): T {
  return DIContainer.getInstance().resolve<T>(key);
}

/**
 * Type-safe service keys
 * Use these instead of string literals to catch typos at compile time
 */
export const ServiceKeys = {
  IDEMPOTENCY_STORE: 'idempotencyStore',
  COMMISSION_REPOSITORY: 'commissionRepository',
  SIGNATURE_VERIFIER: 'signatureVerifier',
} as const;

/**
 * Type-safe getters for common services
 */
export function getIdempotencyStore(): IIdempotencyStore {
  return getService<IIdempotencyStore>(ServiceKeys.IDEMPOTENCY_STORE);
}

export function getCommissionRepository(): ICommissionRepository {
  return getService<ICommissionRepository>(ServiceKeys.COMMISSION_REPOSITORY);
}

export function getSignatureVerifier(): IWebhookSignatureVerifier {
  return getService<IWebhookSignatureVerifier>(ServiceKeys.SIGNATURE_VERIFIER);
}
