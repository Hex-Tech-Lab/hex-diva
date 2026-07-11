/**
 * Webhook Signature Verifier Port
 * Abstracts webhook signature verification
 * Allows domain logic to remain independent of concrete verification implementations
 */

export interface IWebhookSignatureVerifier {
  /**
   * Verify webhook signature from request using HMAC-SHA256 (or provider-specific method)
   * @param body - Raw request body as string (must be the exact bytes received)
   * @param signature - Signature header value from request headers
   * @param secret - Webhook secret key for HMAC computation
   * @returns true if signature is valid and authentic, false otherwise (tampering or invalid)
   * @remarks Uses constant-time comparison to prevent timing attacks; case-insensitive hex comparison
   */
  verifySignature(body: string, signature: string, secret: string): Promise<boolean>

  /**
   * Extract webhook ID from request headers (provider-specific header extraction)
   * @param headers - HTTP request headers object
   * @returns Webhook ID from appropriate provider header (e.g., x-shopify-webhook-id), null if not found
   * @remarks Each provider has its own webhook ID header convention
   */
  extractWebhookId(headers: Headers): string | null
}
