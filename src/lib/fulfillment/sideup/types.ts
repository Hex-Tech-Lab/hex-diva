/**
 * Field names confirmed directly from SIDEUP's OpenAPI spec
 * (POST /merchants/order/store request/response schema).
 */
export interface SideupCreateOrderRequest {
  shipment_code: string; // our order ID, used as SIDEUP's shipment identifier
  name: string; // recipient name
  phone: string; // recipient phone
  receiver_extra_phone?: string;
  address: string;
  area_id: number;
  item_description?: string;
  total_cash_collection?: number;
  zero_cash_collection?: boolean;
  courier: string; // required -- SIDEUP expects an explicit courier choice, not auto-selection
  weight: number;
  pickup_phone: string;
  pickup_area_id: number;
  senderDetails?: string;
  order_notes?: string;
  amount: number;
  reverse_order?: number;
  exchange_order?: number;
  landmark?: string;
  open_package?: number;
}

export interface SideupOrderItem {
  id: number;
  shipment_code: string;
  // Additional OrderItem fields exist per the spec but weren't enumerated
  // in what was fetched -- only id and shipment_code were confirmed as
  // the response's identifying fields.
  [key: string]: unknown;
}

export interface SideupCreateOrderResponse {
  data: SideupOrderItem;
}

export interface SideupCityItem {
  id: number;
  name: string;
  name_ar: string | null;
  zone_id: number;
}

export interface SideupZoneItem {
  id: number;
  name: string;
  name_ar: string | null;
}

export interface SideupAreaItem {
  id: number;
  name: string;
  name_ar: string | null;
  city_id: number;
}

export interface SideupCourierItem {
  id: number;
  name: string;
  logo: string | null;
  is_active: boolean;
}
