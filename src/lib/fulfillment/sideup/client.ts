/**
 * SIDEUP is the first live fulfillment provider -- a merchant account
 * already exists. Confirmed directly against SIDEUP's own OpenAPI spec
 * (https://app.swaggerhub.com/apis-docs/sideup-aa3/Sideup2.1/1.0.0),
 * fetched via api.swaggerhub.com's raw spec endpoint -- real schema, not
 * guessed:
 *   - Production Egypt base URL: https://portal.beta.eg.sideup.co/api
 *     (note: "beta" is part of the confirmed hostname itself, not a
 *     placeholder -- this is what SIDEUP's own spec labels as
 *     "Production - Egypt")
 *   - Auth: OAuth2 password grant at POST /oauth/token
 *     (grant_type, client_id, client_secret, username, password), then
 *     `Authorization: Bearer <access_token>` on subsequent calls.
 *     Different pattern from Bosta/PayTabs' static API keys -- this
 *     client owns token acquisition and caching, not just a passthrough
 *     key like the others.
 *
 * Same dormant-safe pattern as every other provider client: config read
 * lazily, never at module load. Token fetch happens on first actual API
 * call, not at getSideupConfig() time, so a missing/invalid credential
 * still doesn't crash anything until a shipment is actually attempted.
 */

export class SideupNotConfiguredError extends Error {
  constructor() {
    super('SIDEUP is not configured (SIDEUP_CLIENT_ID / SIDEUP_CLIENT_SECRET / SIDEUP_USERNAME / SIDEUP_PASSWORD unset).');
    this.name = 'SideupNotConfiguredError';
  }
}

export interface SideupConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  baseUrl: string;
}

let cachedConfig: SideupConfig | null | undefined;

const DEFAULT_BASE_URL = 'https://portal.beta.eg.sideup.co/api';

export function getSideupConfig(): SideupConfig {
  if (cachedConfig === undefined) {
    const clientId = process.env.SIDEUP_CLIENT_ID;
    const clientSecret = process.env.SIDEUP_CLIENT_SECRET;
    const username = process.env.SIDEUP_USERNAME;
    const password = process.env.SIDEUP_PASSWORD;

    cachedConfig = clientId && clientSecret && username && password
      ? {
          clientId,
          clientSecret,
          username,
          password,
          baseUrl: process.env.SIDEUP_BASE_URL || DEFAULT_BASE_URL,
        }
      : null;
  }

  if (!cachedConfig) {
    throw new SideupNotConfiguredError();
  }

  return cachedConfig;
}

interface TokenState {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
}

let cachedToken: TokenState | null = null;

/**
 * Get a valid Bearer token, fetching a new one via the password grant if
 * none is cached or the cached one is expired. SIDEUP's spec confirms a
 * refresh_token grant exists at the same /oauth/token endpoint but the
 * exact expires_in field name in the token response wasn't in what was
 * fetched from the spec -- refreshes via full password re-auth for now
 * rather than guess the refresh flow's exact shape.
 */
export async function getSideupAccessToken(): Promise<string> {
  const config = getSideupConfig();

  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  const response = await fetch(`${config.baseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'password',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      username: config.username,
      password: config.password,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SIDEUP OAuth token request failed (${response.status}): ${body}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error(`SIDEUP token response missing access_token: ${JSON.stringify(data)}`);
  }

  // expires_in field name/units unconfirmed from what was fetched -- fall
  // back to a conservative 5-minute assumed lifetime if absent, forcing a
  // re-auth sooner rather than risking use of an actually-expired token.
  const expiresInSeconds = typeof data.expires_in === 'number' ? data.expires_in : 300;

  cachedToken = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + expiresInSeconds * 1000 - 10_000, // 10s safety margin
  };

  return cachedToken.accessToken;
}
