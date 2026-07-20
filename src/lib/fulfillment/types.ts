export type FulfillmentProviderId = 'bosta' | 'turuq' | 'flextock' | 'khazenly' | 'presto' | 'fincart' | 'oto';

export interface ShipmentAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  governorateCode: string;
  postalCode?: string;
}

export interface ShipmentLineItem {
  description: string;
  quantity: number;
}

export interface CreateShipmentRequest {
  orderId: string;
  cartId: string;
  destination: ShipmentAddress;
  items: ShipmentLineItem[];
  /** Cash-on-delivery amount to collect from the customer; 0/undefined for prepaid orders. */
  codAmount?: number;
  notes?: string;
}

export interface CreateShipmentResult {
  providerShipmentRef: string;
  trackingUrl?: string;
}

export type ShipmentStatus =
  | 'pending'
  | 'created'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed_delivery'
  | 'returned'
  | 'cancelled';

/**
 * Common contract every fulfillment provider adapter implements, mirroring
 * IPaymentProvider (docs/PAYMENT_PROVIDER_ARCHITECTURE_V2.md). Keeps the
 * selector and checkout/webhook call sites provider-agnostic.
 */
export interface IFulfillmentProvider {
  readonly providerId: FulfillmentProviderId;
  createShipment(request: CreateShipmentRequest): Promise<CreateShipmentResult>;
  trackShipment(providerShipmentRef: string): Promise<{ status: ShipmentStatus }>;
}
