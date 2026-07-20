import { getStripeClient } from './client';
import type { CheckoutSessionRequest } from './types';

/**
 * Create an idempotent Stripe checkout session for order payment
 * @param request - Checkout parameters including cart, URLs, and idempotency key
 * @returns Stripe checkout session with payment URL and session ID
 */
export async function createCheckoutSession(request: CheckoutSessionRequest) {
  const { cart, successUrl, cancelUrl, idempotencyKey } = request;

  const lineItems = cart.items.map((item) => ({
    price_data: {
      currency: 'usd',
      product_data: {
        id: item.productId,
        name: `Product ${item.productId}`,
      },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }));

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create(
    {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: request.customerId || undefined,
      metadata: {
        user_id: request.customerId || '',
      },
      invoice_creation: {
        enabled: true,
      },
    },
    {
      idempotencyKey,
    }
  );

  return session;
}
