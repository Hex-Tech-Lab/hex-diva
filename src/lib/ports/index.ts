/**
 * Port Interfaces (Hexagonal Architecture)
 * Define contracts for external dependencies (DB, Cache, etc.)
 * Domain logic depends on these ports, not concrete implementations
 */

export type { ICommissionRepository } from './ICommissionRepository'
export type { IIdempotencyStore, IdempotencyCheckResult, WebhookProvider } from './IIdempotencyStore'
export type { IWebhookSignatureVerifier } from './IWebhookSignatureVerifier'
export type {
  IWebhookEventLogger,
  WebhookEventLogInput,
  WebhookEventRecord,
} from './IWebhookEventLogger'
