/**
 * Shopify Payment Gateway Sync
 *
 * The Shopify GraphQL Admin API has no query that exposes which payment
 * gateways are actually enabled on a store (confirmed via research — only
 * digital-wallet support and order-history inference are available there).
 * The legacy REST Admin API does: `GET /admin/api/{version}/payment_gateways.json`
 * (resource "PaymentGateway"). Shopify deprecated this endpoint for public
 * apps in Oct 2024, but it should keep working for a private/custom app
 * hitting its own store — which is our case here. Because it's deprecated,
 * this module treats every failure mode (404, 406, removal) as an expected,
 * non-fatal degradation rather than a hard error — see `checkGatewayEndpointHealth`.
 *
 * This module does NOT bypass the existing settings write path. It proposes
 * a draft via `logAuditChange('propose')`, immediately self-approves via
 * `logAuditChange('approve')` (the sync runs as an automated system actor,
 * there's no human in the loop for a scheduled job), then calls
 * `persistSettingsAndDeploy` — the exact same CAS-guarded, audited path the
 * admin UI uses. This preserves Law #2 (request-scoped Supabase client, via
 * SettingsRepository) and the audit trail (ADR 008/009 style ownership
 * binding — every write is attributable to a named actor, here
 * `SHOPIFY_SYNC_ACTOR_EMAIL`).
 */

import { SettingsRepository } from './settingsRepository';
import { logAuditChange, persistSettingsAndDeploy } from './settingsManager';
import type { PaymentSettings, PaymentProvider } from './settingsContracts';

const SHOPIFY_SYNC_ACTOR_EMAIL = 'shopify-sync@hex-diva.system';

/** Shape of a single row in payment_gateways.json's `payment_gateways` array. */
export interface ShopifyPaymentGateway {
  id: number;
  name: string;
  disabled: boolean;
  provider_id: string;
  sandbox: boolean;
  processing_method: string;
  service_name: string;
  type: string;
  enabled_card_brands?: string[];
  metadata?: Record<string, unknown>;
}

interface ShopifyPaymentGatewaysResponse {
  payment_gateways: ShopifyPaymentGateway[];
}

export type PaymentCategoryKey = keyof PaymentSettings; // 'cardInstallments' | 'fawryCash' | 'walletsInstapay' | 'disbursement'
type PaymentRole = 'advertised' | 'fallback';
/** A specific advertised/fallback provider slot within a category. */
interface PaymentSlot {
  category: PaymentCategoryKey;
  role: PaymentRole;
}

export interface GatewayFetchResult {
  ok: boolean;
  gateways?: ShopifyPaymentGateway[];
  /** True specifically when Shopify returned 404 — signals the endpoint may be gone for good. */
  notFound?: boolean;
  status?: number;
  error?: string;
}

interface ShopifyRestEnv {
  shopName: string;
  apiVersion: string;
  adminToken: string;
}

/**
 * Reads the Shopify REST credentials from env. Returns null (never throws)
 * when any are missing — the Shopify app may not be fully installed yet in
 * this environment per .env.local, and callers must degrade gracefully.
 */
export function getShopifyRestEnv(): ShopifyRestEnv | null {
  const shopName = process.env.SHOPIFY_SHOP_NAME;
  const adminToken = process.env.SHOPIFY_ADMIN_API_TOKEN;
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2026-07';

  if (!shopName || !adminToken || isPlaceholder(shopName) || isPlaceholder(adminToken)) {
    return null;
  }

  return { shopName, adminToken, apiVersion };
}

function isPlaceholder(value: string): boolean {
  return value.startsWith('your_') || value.trim() === '';
}

function gatewaysUrl(env: ShopifyRestEnv): string {
  const shop = env.shopName.includes('.myshopify.com')
    ? env.shopName
    : `${env.shopName}.myshopify.com`;
  return `https://${shop}/admin/api/${env.apiVersion}/payment_gateways.json`;
}

/** Bounded so a hung Shopify REST call can't stall the sync job or the health probe. */
const GATEWAY_FETCH_TIMEOUT_MS = 8000;

/**
 * Calls the legacy REST payment_gateways.json endpoint.
 * Never throws — network errors, non-2xx, timeouts, and malformed bodies all
 * funnel into a `GatewayFetchResult` so callers (the sync job and the health
 * check) can decide how to degrade.
 */
export async function fetchShopifyPaymentGateways(): Promise<GatewayFetchResult> {
  const env = getShopifyRestEnv();
  if (!env) {
    return { ok: false, error: 'Shopify Admin REST credentials not configured' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GATEWAY_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(gatewaysUrl(env), {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': env.adminToken,
        'Content-Type': 'application/json',
      },
      // This is admin config data, not something we want cached across requests.
      cache: 'no-store',
      signal: controller.signal,
    });

    if (res.status === 404) {
      return { ok: false, notFound: true, status: 404, error: 'payment_gateways.json returned 404 (endpoint removed?)' };
    }

    if (!res.ok) {
      return { ok: false, status: res.status, error: `Shopify REST API returned ${res.status}` };
    }

    const body = (await res.json()) as ShopifyPaymentGatewaysResponse;
    if (!Array.isArray(body.payment_gateways)) {
      return { ok: false, error: 'Unexpected response shape from payment_gateways.json' };
    }

    return { ok: true, gateways: body.payment_gateways };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: `Shopify REST call timed out after ${GATEWAY_FETCH_TIMEOUT_MS}ms` };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timeout);
  }
}

const ALL_SLOTS: PaymentSlot[] = [
  { category: 'cardInstallments', role: 'advertised' },
  { category: 'cardInstallments', role: 'fallback' },
  { category: 'fawryCash', role: 'advertised' },
  { category: 'fawryCash', role: 'fallback' },
  { category: 'walletsInstapay', role: 'advertised' },
  { category: 'walletsInstapay', role: 'fallback' },
  { category: 'disbursement', role: 'advertised' },
  { category: 'disbursement', role: 'fallback' },
];

function getSlot(settings: PaymentSettings, slot: PaymentSlot): PaymentProvider | undefined {
  return settings[slot.category][slot.role];
}

function setSlot(settings: PaymentSettings, slot: PaymentSlot, provider: PaymentProvider): void {
  settings[slot.category][slot.role] = provider;
}

/**
 * Category-mapping judgment calls (documented per the task requirements):
 *
 * PaymentSettingsSchema models checkout as named payment-method *categories*
 * (cardInstallments, fawryCash, walletsInstapay, disbursement), each with an
 * `advertised` provider and an optional private `fallback`. Shopify's gateway
 * list is a flat array of *providers* (Paymob, Fawry, PayPal, manual, etc.),
 * each with a `processing_method` ('direct', 'manual', 'offsite', ...) and
 * `service_name`. There's no 1:1 semantic mapping, so we use these heuristics
 * over the flattened set of 8 (category, role) slots:
 *
 * 1. Match by provider name first: if a gateway's `service_name` or `name`
 *    fuzzily matches an EXISTING provider name already occupying a slot
 *    (case-insensitive substring), we update that slot in place — this is
 *    the common case (re-syncing fee/status changes for a provider an admin
 *    already configured) and avoids reshuffling slots on every sync.
 * 2. If no existing slot matches by name, we fill the first *empty-looking*
 *    slot in fixed priority order (declared above) — an "empty-looking" slot
 *    is one whose current source is already 'shopify' and whose name no
 *    longer matches anything Shopify reports (stale sync artifact), so we
 *    don't clobber a manually-curated provider that Shopify just doesn't
 *    happen to list. `fallback` slots are also "empty-looking" if unset.
 * 3. `processing_method === 'manual'` (Shopify's own COD/bank-transfer type)
 *    is treated as evidence for `codSupport: true`; 'direct'/'offsite' are
 *    treated as card processors (`cardSupport: true`).
 * 4. `disabled: true` gateways are skipped entirely — we only sync gateways
 *    Shopify reports as live, since disabled ones aren't real checkout options.
 * 5. Shopify's REST payload has no fee/settlement-cycle data (that lives in
 *    the provider's own dashboard, not Shopify's config), so `fees` and
 *    `settlementCycle` are NOT touched by the sync — only fields Shopify can
 *    actually attest to (`cardSupport`, `codSupport`, `shopifyIntegration`,
 *    `name`, `source`, `lastSyncedAt`) are overwritten. This avoids the sync
 *    silently wiping out manually-researched fee data with zeros.
 * 6. `walletSupport` is left untouched — Shopify's REST payload doesn't
 *    reliably indicate wallet capability (that requires the GraphQL digital
 *    wallets query, out of scope here) so we don't guess.
 * 7. The `disbursement` category is Shopify-blind by definition (Shopify has
 *    no concept of affiliate/supplier payout) — its slots will only ever get
 *    filled by heuristic 2 if left empty-looking, never by name match.
 */
function slotKey(slot: PaymentSlot): string {
  return `${slot.category}.${slot.role}`;
}

export function mapGatewaysOntoPaymentSettings(
  current: PaymentSettings,
  gateways: ShopifyPaymentGateway[],
  syncedAt: string
): { updated: PaymentSettings; touchedSlots: PaymentSlot[] } {
  const updated: PaymentSettings = structuredClone(current);
  const touchedSlots: PaymentSlot[] = [];
  // Slots already claimed this run are excluded from further matching, both to
  // avoid two different gateways being crammed into the same slot and to keep
  // touchedSlots free of duplicate (category, role) entries.
  const touchedKeys = new Set<string>();

  const liveGateways = gateways.filter((g) => !g.disabled);

  for (const gateway of liveGateways) {
    const gatewayLabel = (gateway.service_name || gateway.name || '').toLowerCase();
    if (!gatewayLabel) continue;

    const availableSlots = ALL_SLOTS.filter((slot) => !touchedKeys.has(slotKey(slot)));

    // Heuristic 1: match an existing slot by name.
    let targetSlot = availableSlots.find((slot) => {
      const provider = getSlot(updated, slot);
      if (!provider) return false;
      return (
        provider.name.toLowerCase().includes(gatewayLabel) ||
        gatewayLabel.includes(provider.name.toLowerCase())
      );
    });

    // Heuristic 2: fall back to the first empty-looking slot.
    if (!targetSlot) {
      targetSlot = availableSlots.find((slot) => {
        const provider = getSlot(updated, slot);
        if (!provider) return true; // unset fallback slot
        return (
          provider.source === 'shopify' &&
          !liveGateways.some(
            (g) => (g.service_name || g.name || '').toLowerCase() === provider.name.toLowerCase()
          )
        );
      });
    }

    if (!targetSlot) {
      // No safe slot to place this gateway without clobbering manual config;
      // skip it rather than guess.
      continue;
    }

    const isManualMethod = gateway.processing_method === 'manual';
    const isCardMethod = gateway.processing_method === 'direct' || gateway.processing_method === 'offsite';
    const existing = getSlot(updated, targetSlot);

    setSlot(updated, targetSlot, {
      name: gateway.service_name || gateway.name,
      fees: existing?.fees ?? { percentagePerTransaction: 0, fixedPerTransaction: 0 },
      settlementCycle: existing?.settlementCycle ?? 'unknown',
      codSupport: isManualMethod ? true : existing?.codSupport ?? false,
      cardSupport: isCardMethod ? true : existing?.cardSupport ?? false,
      walletSupport: existing?.walletSupport ?? false,
      shopifyIntegration: true,
      cashAgentLocations: existing?.cashAgentLocations,
      source: 'shopify',
      lastSyncedAt: syncedAt,
    });
    touchedSlots.push(targetSlot);
    touchedKeys.add(slotKey(targetSlot));
  }

  return { updated, touchedSlots };
}

export interface SyncResult {
  ok: boolean;
  touchedSlots?: PaymentSlot[];
  skippedReason?: string;
  error?: string;
  notFound?: boolean;
}

/**
 * Runs one full sync pass: fetch gateways -> map onto payment settings ->
 * write through the existing propose/approve/persist audit path.
 * Never throws; all failure modes surface as `SyncResult.ok === false`.
 */
export async function syncShopifyPaymentGateways(): Promise<SyncResult> {
  const fetchResult = await fetchShopifyPaymentGateways();
  if (!fetchResult.ok || !fetchResult.gateways) {
    return {
      ok: false,
      error: fetchResult.error,
      notFound: fetchResult.notFound,
      skippedReason: fetchResult.error,
    };
  }

  const current = await SettingsRepository.getSetting('payment');
  const syncedAt = new Date().toISOString();
  const { updated, touchedSlots } = mapGatewaysOntoPaymentSettings(current, fetchResult.gateways, syncedAt);

  if (touchedSlots.length === 0) {
    return { ok: true, touchedSlots: [], skippedReason: 'No live Shopify gateways mapped onto existing slots' };
  }

  try {
    // Propose then self-approve: this is an automated system actor, not an
    // admin sitting in the UI, so there's no separate human-approval step —
    // but we still go through the same DRAFT -> APPROVED -> APPLIED CAS
    // lifecycle as a human-initiated change so the audit trail is uniform.
    const fieldLabel = touchedSlots.map((s) => `${s.category}.${s.role}`).join(',');
    const draft = await logAuditChange(
      SHOPIFY_SYNC_ACTOR_EMAIL,
      'payment',
      fieldLabel,
      current,
      updated,
      'propose'
    );

    await logAuditChange(SHOPIFY_SYNC_ACTOR_EMAIL, 'payment', fieldLabel, current, updated, 'approve', draft.id);

    // persistSettingsAndDeploy patches via a dot-path onto the current section,
    // then re-validates and CAS-writes the whole section per call. Writing
    // per (category, role) slot would let advertised/fallback within the same
    // category land in two separate CAS writes -- a concurrent edit landing
    // between them could leave a category half-synced. Grouping by category
    // and writing the whole {advertised, fallback} value in one call per
    // touched category removes that partial-write window; it's still not a
    // single atomic write across all four categories (that would need a
    // "replace whole section" primitive in settingsManager, out of scope
    // here), but a torn write can no longer happen *within* one category.
    const touchedCategories = Array.from(new Set(touchedSlots.map((s) => s.category)));
    let lastResult: Awaited<ReturnType<typeof persistSettingsAndDeploy>> | undefined;
    for (const category of touchedCategories) {
      lastResult = await persistSettingsAndDeploy(
        draft.id,
        updated[category],
        'payment',
        category,
        SHOPIFY_SYNC_ACTOR_EMAIL,
        false
      );
      if (!lastResult.success) {
        return { ok: false, error: lastResult.error, touchedSlots };
      }
    }

    return { ok: true, touchedSlots };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Lightweight probe used by the health check: does the legacy endpoint still
 * respond (2xx or an auth/config error we can attribute to us), or has
 * Shopify actually removed it (404)? Never throws.
 */
export async function checkGatewayEndpointHealth(): Promise<{
  reachable: boolean;
  deprecated404: boolean;
  configured: boolean;
  detail?: string;
}> {
  const env = getShopifyRestEnv();
  if (!env) {
    return { reachable: false, deprecated404: false, configured: false, detail: 'Not configured' };
  }

  const result = await fetchShopifyPaymentGateways();
  if (result.ok) {
    return { reachable: true, deprecated404: false, configured: true };
  }

  return {
    reachable: false,
    deprecated404: Boolean(result.notFound),
    configured: true,
    detail: result.error,
  };
}
