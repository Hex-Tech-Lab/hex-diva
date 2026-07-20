/**
 * Bosta is the confirmed Wave 9 Phase 1 courier -- their own support docs
 * confirm individual sellers in Egypt need only a National ID, no
 * Commercial Register/Tax Card (see docs/ROADMAP_MULTI_PROVIDER_WAVES.md).
 *
 * Same dormant-safe pattern as every other provider client in this
 * codebase: config read lazily, never at module load.
 *
 * CONFIRMED directly against Bosta's own API reference page (v2.0.0,
 * docs.bosta.co -- a JS-rendered SPA WebFetch can't execute, confirmed by
 * loading the page in a real browser and reading document.body.innerText):
 *   - Live server / base URL: http://app.bosta.co/api/v2
 *   - Auth: `Authorization: <api_key>` header, no Bearer prefix
 *   - Full endpoint inventory exists under: Users, Groups, Businesses,
 *     Pickup locations, Bosta Box, Pickup Requests, city (List All
 *     Cities / Get one city / Get zones info / Get districts info / Get
 *     all districts), notifications, Deliveries (Create delivery [POST],
 *     Create bulk deliveries, Business terminate delivery, Search for
 *     deliveries, Business view/update delivery, Print Air Waybill),
 *     Pricing (Get Pricing Plan, Get Shipping fees estimate, Get
 *     insurance fees), Products.
 *   - The "city" endpoints (List All Cities / Get zones info / Get
 *     districts info) are the real, live coverage-lookup mechanism this
 *     module's governorate-coverage table (migrations/019) was designed
 *     for as `source = 'provider_api'` -- not hypothetical. A future
 *     sync job should call these and populate
 *     fulfillment_provider_coverage from the actual response, never
 *     guessed.
 *   - Pickup Locations has its own API surface (Create your default
 *     pickup location, List/Add/Update/Get/Delete pickup location, Set
 *     default). This means shipment.ts's dropOffAddress should reference
 *     a pre-registered pickup location, not raw address fields
 *     constructed per-shipment -- see the note in shipment.ts.
 *
 * STILL UNCONFIRMED: the exact URL path segments (only display names like
 * "Create delivery" were visible, not the literal path -- /deliveries is
 * the REST-conventional guess, matches the confirmed display name, but
 * isn't verified character-for-character), and exact request/response
 * field names within each endpoint. Verify against the live, authenticated
 * API reference before this is used for a real shipment.
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
