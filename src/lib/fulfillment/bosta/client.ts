/**
 * Bosta is the confirmed Wave 9 Phase 1 courier -- their own support docs
 * confirm individual sellers in Egypt need only a National ID, no
 * Commercial Register/Tax Card (see docs/ROADMAP_MULTI_PROVIDER_WAVES.md).
 *
 * Same dormant-safe pattern as every other provider client in this
 * codebase: config read lazily, never at module load.
 *
 * CONFIRMED directly against Bosta's own API reference page (v2.0.0):
 *   - Live server / base URL: http://app.bosta.co/api/v2
 *   - Auth: `Authorization: <api_key>` header, no Bearer prefix
 * (docs.bosta.co is a JS-rendered SPA that WebFetch can't execute --
 * these were confirmed by loading the page in a real browser, not
 * guessed.)
 *
 * STILL UNCONFIRMED: individual endpoint paths beyond the base URL (e.g.
 * whether shipment creation is POST /deliveries as assumed in
 * shipment.ts), exact request/response field names, and delivery `type`
 * codes -- the full endpoint list wasn't visible in what was shared.
 * Verify the specific endpoint/payload shape against the live API
 * reference before this is used for a real shipment.
 */

export class BostaNotConfiguredError extends Error {
  constructor() {
    super('Bosta is not configured (BOSTA_API_KEY unset).');
    this.name = 'BostaNotConfiguredError';
  }
}

export interface BostaConfig {
  apiKey: string;
  baseUrl: string;
}

let cachedConfig: BostaConfig | null | undefined;

// Confirmed base path is app.bosta.co/api/v2; using https despite the API
// reference displaying "http://" (almost certainly a Swagger UI display
// default, not an actual plaintext-only requirement) -- never send an API
// key over unencrypted HTTP regardless of what a docs page shows.
const DEFAULT_BASE_URL = 'https://app.bosta.co/api/v2';

export function getBostaConfig(): BostaConfig {
  if (cachedConfig === undefined) {
    const apiKey = process.env.BOSTA_API_KEY;

    cachedConfig = apiKey
      ? {
          apiKey,
          baseUrl: process.env.BOSTA_BASE_URL || DEFAULT_BASE_URL,
        }
      : null;
  }

  if (!cachedConfig) {
    throw new BostaNotConfiguredError();
  }

  return cachedConfig;
}
