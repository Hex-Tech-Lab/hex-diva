export interface CartItem {
  product_id: string;
  quantity: number;
  price_at_purchase: number;
  added_at?: string;
  [key: string]: unknown;
}

export interface CartTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

// Free shipping threshold, in EGP
const FREE_SHIPPING_THRESHOLD = 50;
const FLAT_SHIPPING_RATE = 10;
const TAX_RATE = 0.08;

/**
 * Compute cart subtotal/shipping/tax/total from a list of cart items.
 */
export function computeCartTotals(items: CartItem[]): CartTotals {
  if (items.length === 0) {
    return { subtotal: 0, shipping: 0, tax: 0, total: 0 };
  }

  const subtotal = items.reduce(
    (sum: number, item: CartItem) => sum + item.price_at_purchase * item.quantity,
    0
  );
  const shipping = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + shipping + tax;

  return { subtotal, shipping, tax, total };
}
