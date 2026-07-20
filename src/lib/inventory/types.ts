/** Provider-agnostic order line item -- used by inventory decrement/restore
 * regardless of which payment provider processed the order. */
export interface OrderLineItem {
  product_id: string;
  quantity: number;
  price: number;
}
