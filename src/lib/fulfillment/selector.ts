import { getSupabaseAdmin } from '@/lib/db';
import { BostaProvider } from './bosta/shipment';
import type { CreateShipmentRequest, CreateShipmentResult, FulfillmentProviderId, IFulfillmentProvider } from './types';

export class NoFulfillmentProviderAvailableError extends Error {
  constructor(governorateCode: string) {
    super(`No enabled fulfillment provider has confirmed coverage for governorate ${governorateCode}.`);
    this.name = 'NoFulfillmentProviderAvailableError';
  }
}

const PROVIDER_REGISTRY: Partial<Record<FulfillmentProviderId, () => IFulfillmentProvider>> = {
  bosta: () => new BostaProvider(),
  // turuq/flextock/khazenly/presto/fincart/oto: not yet implemented --
  // add here once eligibility is confirmed and an adapter is built,
  // matching this same shape.
};

/**
 * Pick a fulfillment provider for a shipment, in priority order, but only
 * among providers with CONFIRMED coverage for the destination governorate
 * (source != nothing -- see migrations/019_fulfillment_engine.sql).
 *
 * Deliberately does NOT fall back to "no coverage row = assume covered"
 * or "assume nationwide" -- that would be exactly the kind of fabricated
 * capability claim this system is built to avoid. A governorate with no
 * coverage data for any enabled provider throws
 * NoFulfillmentProviderAvailableError rather than silently guessing.
 */
export async function createShipmentForOrder(
  request: CreateShipmentRequest
): Promise<{ result: CreateShipmentResult; providerId: FulfillmentProviderId }> {
  const supabase = getSupabaseAdmin();

  const { data: governorate, error: govError } = await supabase
    .from('egypt_governorates')
    .select('id, code')
    .eq('code', request.destination.governorateCode)
    .single();

  if (govError || !governorate) {
    throw new Error(`Unknown governorate code: ${request.destination.governorateCode}`);
  }

  const { data: candidates, error: candidatesError } = await supabase
    .from('fulfillment_providers')
    .select('provider_id, priority, fulfillment_provider_coverage!inner(is_covered)')
    .eq('is_enabled', true)
    .eq('fulfillment_provider_coverage.governorate_id', governorate.id)
    .eq('fulfillment_provider_coverage.is_covered', true)
    .order('priority', { ascending: true });

  if (candidatesError) {
    throw new Error(`Failed to query fulfillment provider coverage: ${candidatesError.message}`);
  }

  if (!candidates || candidates.length === 0) {
    throw new NoFulfillmentProviderAvailableError(governorate.code);
  }

  let lastError: unknown;

  for (const candidate of candidates) {
    const providerId = candidate.provider_id as FulfillmentProviderId;
    const factory = PROVIDER_REGISTRY[providerId];

    if (!factory) {
      console.warn(`No adapter implemented yet for enabled provider: ${providerId}`);
      continue;
    }

    try {
      const provider = factory();
      const result = await provider.createShipment(request);
      return { result, providerId };
    } catch (err) {
      console.error(`Fulfillment provider ${providerId} failed, trying next in cascade:`, err);
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new NoFulfillmentProviderAvailableError(governorate.code);
}
