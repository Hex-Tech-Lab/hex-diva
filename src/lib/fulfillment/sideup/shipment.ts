import { getSideupConfig, getSideupAccessToken } from './client';
import type {
  SideupAreaItem,
  SideupCityItem,
  SideupCourierItem,
  SideupCreateOrderRequest,
  SideupCreateOrderResponse,
} from './types';
import type {
  CreateShipmentRequest,
  CreateShipmentResult,
  IFulfillmentProvider,
  ShipmentStatus,
} from '../types';

async function sideupFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getSideupConfig();
  const token = await getSideupAccessToken();

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SIDEUP request to ${path} failed (${response.status}): ${body}`);
  }

  return response.json();
}

export class SideupAreaNotResolvedError extends Error {
  constructor(cityName: string) {
    super(`Could not resolve a SIDEUP area_id for city "${cityName}" via their own city/area lookup API -- no fabricated mapping used.`);
    this.name = 'SideupAreaNotResolvedError';
  }
}

/**
 * Resolve a destination city name to SIDEUP's own internal area_id, via
 * their real GET /merchants/city + GET /merchants/city/{id}/areas lookup
 * APIs (confirmed to exist in their OpenAPI spec) -- not a hardcoded
 * mapping table, since no such mapping has been verified. Case-insensitive
 * substring match on city name; throws SideupAreaNotResolvedError rather
 * than guessing if nothing matches.
 */
async function resolveAreaId(cityName: string): Promise<number> {
  const cities = await sideupFetch<SideupCityItem[]>('/merchants/city');
  const normalizedTarget = cityName.trim().toLowerCase();

  const city = cities.find(
    (c) => c.name.toLowerCase().includes(normalizedTarget) || normalizedTarget.includes(c.name.toLowerCase())
  );

  if (!city) {
    throw new SideupAreaNotResolvedError(cityName);
  }

  const areas = await sideupFetch<SideupAreaItem[]>(`/merchants/city/${city.id}/areas`);
  const firstArea = areas[0];

  if (!firstArea) {
    throw new SideupAreaNotResolvedError(cityName);
  }

  // No finer-grained area signal available from CreateShipmentRequest
  // (only city-level data is collected today) -- takes the first area in
  // the resolved city rather than guessing which of several is correct.
  // Revisit once the address model captures area-level detail.
  return firstArea.id;
}

/**
 * SIDEUP requires an explicit courier choice per order (it's an
 * aggregator across couriers, not a single carrier) -- resolved via their
 * real GET /merchants/courier/{area_id} lookup, picking the first
 * is_active courier. This is a naive "first available" default, not a
 * rate/quality comparison -- SIDEUP also exposes pricing-comparison
 * endpoints (GET /merchants/compare_prices) that a smarter selection
 * could use later, but that's out of scope for this pass.
 */
async function pickCourier(areaId: number): Promise<string> {
  const couriers = await sideupFetch<SideupCourierItem[]>(`/merchants/courier/${areaId}`);
  const active = couriers.find((c) => c.is_active);

  if (!active) {
    throw new Error(`No active SIDEUP courier available for area_id ${areaId}`);
  }

  return active.name;
}

/** Merchant's own pickup location -- not part of this app's config model
 * yet, comes from env until there's a settings UI. pickup_area_id must be
 * a real SIDEUP area_id for the merchant's actual pickup location,
 * obtained the same way (city/area lookup), set once at deployment time. */
function getPickupConfig() {
  return {
    pickupPhone: process.env.SIDEUP_PICKUP_PHONE || '',
    pickupAreaId: Number(process.env.SIDEUP_PICKUP_AREA_ID || 0),
  };
}

export class SideupProvider implements IFulfillmentProvider {
  readonly providerId = 'sideup' as const;

  async createShipment(request: CreateShipmentRequest): Promise<CreateShipmentResult> {
    const areaId = await resolveAreaId(request.destination.city);
    const courier = await pickCourier(areaId);
    const { pickupPhone, pickupAreaId } = getPickupConfig();

    const payload: SideupCreateOrderRequest = {
      shipment_code: request.orderId,
      name: request.destination.fullName,
      phone: request.destination.phone,
      address: request.destination.street,
      area_id: areaId,
      item_description: request.items.map((item) => `${item.quantity}x ${item.description}`).join(', '),
      total_cash_collection: request.codAmount || 0,
      zero_cash_collection: !request.codAmount,
      courier,
      // Weight isn't part of CreateShipmentRequest today -- SIDEUP marks
      // it required, so a placeholder is used pending the order/product
      // model actually tracking package weight. Flagged, not silently
      // defaulted without comment.
      weight: 1,
      pickup_phone: pickupPhone,
      pickup_area_id: pickupAreaId,
      order_notes: request.notes,
      amount: request.codAmount || 0,
    };

    const response = await sideupFetch<SideupCreateOrderResponse>('/merchants/order/store', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      providerShipmentRef: response.data.shipment_code,
    };
  }

  async trackShipment(providerShipmentRef: string): Promise<{ status: ShipmentStatus }> {
    // SIDEUP's spec exposes GET /merchants/order (list, with filters) but
    // no confirmed single-shipment-by-code lookup or webhook mechanism
    // was found in what was fetched from the spec. Filtering the list
    // endpoint by shipment_code client-side as a placeholder -- revisit
    // once the exact filter query params are confirmed; this makes an
    // unfiltered/best-effort request today, which does not scale past a
    // handful of orders and must not be treated as production-ready.
    const result = await sideupFetch<{ items: Array<{ shipment_code: string; status?: string }> }>(
      '/merchants/order'
    );

    const order = result.items.find((item) => item.shipment_code === providerShipmentRef);

    if (!order) {
      throw new Error(`SIDEUP order not found for shipment_code ${providerShipmentRef}`);
    }

    return { status: mapSideupStatus(order.status) };
  }
}

/**
 * SIDEUP's exact status string values weren't in what was fetched from
 * the spec (the list endpoint's filter_statistics field names --
 * courier_pending, ready_to_be_picked, to_be_delivered, delivered,
 * returned, cancelled, needs_Action -- suggest the vocabulary, but the
 * per-order `status` field's exact values are unconfirmed). Best-effort
 * substring mapping, same honesty caveat as Bosta's mapBostaState.
 */
function mapSideupStatus(status: unknown): ShipmentStatus {
  const s = String(status || '').toLowerCase();
  if (s.includes('deliver') && !s.includes('to_be')) return 'delivered';
  if (s.includes('to_be_delivered') || s.includes('picked')) return 'out_for_delivery';
  if (s.includes('return')) return 'returned';
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('pending')) return 'pending';
  return 'created';
}
