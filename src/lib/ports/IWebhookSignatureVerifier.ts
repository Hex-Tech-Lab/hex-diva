/**
 * Webhook Signature Verifier Port
 * Abstracts webhook signature verification
 * Allows domain logic to remain independent of concrete verification implementations
 */

export interface IWebhookSignatureVerifier {
  /**
   * Verify webhook signature from request
   * @param body - Raw request body as string
   * @param signature - Signature from request headers
   * @param secret - Webhook secret for verification
   * @returns true if signature is valid, false otherwise
   */
  verifySignature(body: string, signature: string, secret: string): Promise<boolean>

  /**
   * Extract webhook ID from request headers
   */
  extractWebhookId(headers: Headers): string | null
}
