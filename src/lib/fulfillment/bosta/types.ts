/**
 * Field names here match the official (unpublished-on-npm, but real)
 * bosta-nodejs SDK's createDelivery(type, specs, cod, dropOffAddress,
 * businessReference, receiver, notes) signature -- confirmed shape, but
 * the exact sub-field names within each object are inferred from typical
 * Bosta integration examples (Odoo/WooCommerce plugin docs), not from a
 * raw Bosta API reference (unavailable -- see client.ts). Verify against
 * the real dashboard/API reference before relying on this for a live
 * shipment.
 */
export interface BostaReceiver {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}

export interface BostaAddress {
  city: string;
  zone?: string;
  district?: string;
  firstLine: string;
}

export interface BostaCreateDeliveryPayload {
  type: number; // Bosta delivery type code -- e.g. Send/Cash Collection. Unconfirmed which numeric value maps to a standard COD delivery; verify against dashboard.
  specs: {
    packageType?: string;
    size?: string;
    itemsCount?: number;
    description?: string;
  };
  cod?: number;
  dropOffAddress: BostaAddress;
  businessReference: string; // our order ID
  receiver: BostaReceiver;
  notes?: string;
}

export interface BostaCreateDeliveryResponse {
  success: boolean;
  data: {
    _id: string; // Bosta's internal delivery ID -- used for tracking
    trackingNumber?: string;
  };
}
