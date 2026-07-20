/**
 * PayTabs is the primary payment provider for the Egyptian market (see
 * docs/PAYMENT_PROVIDER_ARCHITECTURE_V2.md) -- Stripe/MoR providers don't
 * fit an Egypt-founder, no-foreign-entity, Egypt-only business, and PayTabs
 * specifically has a documented Freelancer KYC path (National ID + personal
 * bank statement, no Commercial Registration / Tax Card required) that
 * matches a pre-incorporation founder.
 *
 * Same dormant-safe pattern as src/lib/stripe/client.ts: nothing here
 * touches env vars at module load. Config is read lazily on first use and
 * throws PayTabsNotConfiguredError (not a generic Error) if unset, so
 * importing this file never crashes the build, and callers can respond
 * gracefully (503) instead of crashing the request.
 */

export class PayTabsNotConfiguredError extends Error {
  constructor() {
    super('PayTabs is not configured (PAYTABS_PROFILE_ID / PAYTABS_SERVER_KEY unset).');
    this.name = 'PayTabsNotConfiguredError';
  }
}

export interface PayTabsConfig {
  profileId: string;
  serverKey: string;
  baseUrl: string;
}

let cachedConfig: PayTabsConfig | null | undefined;

/**
 * PayTabs' API base URL is region-specific and tied to the merchant's
 * dashboard domain (e.g. secure-egypt.paytabs.com) -- it is NOT a fixed
 * constant across all merchants, so it must come from env rather than
 * being hardcoded. Verify the exact value in the PayTabs merchant
 * dashboard once the account is provisioned.
 */
const DEFAULT_BASE_URL = 'https://secure-egypt.paytabs.com';

export function getPayTabsConfig(): PayTabsConfig {
  if (cachedConfig === undefined) {
    const profileId = process.env.PAYTABS_PROFILE_ID;
    const serverKey = process.env.PAYTABS_SERVER_KEY;

    cachedConfig = profileId && serverKey
      ? {
          profileId,
          serverKey,
          baseUrl: process.env.PAYTABS_BASE_URL || DEFAULT_BASE_URL,
        }
      : null;
  }

  if (!cachedConfig) {
    throw new PayTabsNotConfiguredError();
  }

  return cachedConfig;
}
