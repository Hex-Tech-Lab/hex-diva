import { getBostaConfig } from './client';
import type { BostaCreateDeliveryPayload, BostaCreateDeliveryResponse } from './types';
import type {
  CreateShipmentRequest,
  CreateShipmentResult,
  IFulfillmentProvider,
  ShipmentStatus,
} from '../types';

/**
 * Merchant's own pickup location, registered in Bosta's dashboard.
 * Required by the confirmed createDelivery signature's dropOffAddress
 * param (the SDK's naming, not ours) but not yet part of this app's own
 * config -- comes from env until there's a settings UI for it.
 */
function getPickupAddress() {
  return {
    city: process.env.BOSTA_PICKUP_CITY || '',
    zone: process.env.BOSTA_PICKUP_ZONE,
    district: process.env.BOSTA_PICKUP_DISTRICT,
    firstLine: process.env.BOSTA_PICKUP_ADDRESS_LINE || '',
  };
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] || fullName,
    lastName: parts.slice(1).join(' ') || parts[0] || fullName,
  };
}

export class BostaProvider implements IFulfillmentProvider {
  readonly providerId = 'bosta' as const;

  async createShipment(request: CreateShipmentRequest): Promise<CreateShipmentResult> {
    const config = getBostaConfig();
    const { firstName, lastName } = splitName(request.destination.fullName);

    const payload: BostaCreateDeliveryPayload = {
      // Unconfirmed: which numeric type code Bosta expects for a standard
      // COD delivery. Placeholder value, must be confirmed against the
      // dashboard/API reference before a real shipment is created -- see
      // client.ts header comment.
      type: 10,
      specs: {
        itemsCount: request.items.reduce((sum, item) => sum + item.quantity, 0),
        description: request.items.map((item) => `${item.quantity}x ${item.description}`).join(', '),
      },
      cod: request.codAmount,
      dropOffAddress: getPickupAddress(),
      businessReference: request.orderId,
      receiver: {
        firstName,
        lastName,
        phone: request.destination.phone,
      },
      notes: request.notes,
    };

    // Endpoint path unconfirmed -- see client.ts header comment. This
    // matches the most common REST convention for a resource-creation
    // call but has not been verified against Bosta's actual API
    // reference (JS-rendered docs site, unpublished SDK, inaccessible
    // Postman collection -- all checked, none yielded raw HTTP details).
    const response = await fetch(`${config.baseUrl}/deliveries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: config.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Bosta shipment creation failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as BostaCreateDeliveryResponse;

    if (!data.success || !data.data?._id) {
      throw new Error(`Bosta response missing delivery ID: ${JSON.stringify(data)}`);
    }

    return {
      providerShipmentRef: data.data._id,
      trackingUrl: data.data.trackingNumber
        ? `https://bosta.co/tracking/${data.data.trackingNumber}`
        : undefined,
    };
  }

  async trackShipment(providerShipmentRef: string): Promise<{ status: ShipmentStatus }> {
    const config = getBostaConfig();

    const response = await fetch(`${config.baseUrl}/deliveries/${providerShipmentRef}`, {
      headers: { Authorization: config.apiKey },
    });

    if (!response.ok) {
      throw new Error(`Bosta tracking lookup failed (${response.status})`);
    }

    const data = await response.json();
    return { status: mapBostaState(data.data?.state) };
  }
}

/**
 * Bosta's internal delivery-state values are unconfirmed (see client.ts).
 * This mapping is a best-effort placeholder based on common courier
 * terminology and must be verified against real webhook/API payloads.
 */
function mapBostaState(bostaState: unknown): ShipmentStatus {
  const state = String(bostaState || '').toLowerCase();
  if (state.includes('deliver')) return 'delivered';
  if (state.includes('transit') || state.includes('picked')) return 'in_transit';
  if (state.includes('out for delivery')) return 'out_for_delivery';
  if (state.includes('return')) return 'returned';
  if (state.includes('cancel')) return 'cancelled';
  if (state.includes('fail')) return 'failed_delivery';
  return 'created';
}
