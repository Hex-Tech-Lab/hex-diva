import { createHmac, timingSafeEqual } from 'crypto';
import { getPayTabsConfig } from './client';

/**
 * PayTabs IPN/webhook signature verification.
 * https://support.paytabs.com -- HMAC-SHA256 of the raw JSON payload,
 * keyed by the merchant's Server Key, sent in the `signature` header.
 */
export function verifyPayTabsSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) {
    return false;
  }

  const config = getPayTabsConfig();
  const expected = createHmac('sha256', config.serverKey).update(rawBody).digest('hex');

  const expectedBuf = Buffer.from(expected, 'hex');
  const receivedBuf = Buffer.from(signatureHeader, 'hex');

  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }

  return timingSafeEqual(expectedBuf, receivedBuf);
}
