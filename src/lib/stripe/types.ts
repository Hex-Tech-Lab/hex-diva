import type Stripe from 'stripe';

export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

export interface CheckoutSessionRequest {
  cart: Cart;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  idempotencyKey: string;
  /** Internal order ID, stamped onto the Stripe PaymentIntent's metadata so
   * webhooks can reliably link payment_intent.* events back to our order
   * without depending on checkout.session.completed firing first. */
  orderId: string;
}

export interface OrderLineItem {
  product_id: string;
  quantity: number;
  price: number;
}

export interface OrderPayload {
  user_id: string;
  stripe_session_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  items: OrderLineItem[];
}

export type StripeEventHandler = (event: Stripe.Event) => Promise<void>;
