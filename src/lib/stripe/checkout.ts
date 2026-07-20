import { getStripeClient } from './client';
import type { CheckoutSessionRequest } from './types';

export async function createCheckoutSession(request: CheckoutSessionRequest) {
  const { cart, successUrl, cancelUrl, idempotencyKey, orderId, userId } = request;

  const lineItems = cart.items.map((item) => ({
    price_data: {
      currency: 'usd',
      // Stripe's price_data.product_data has no `id` field -- Stripe always
      // generates the ad-hoc Product's ID itself. Our own product identifier
      // is carried in metadata instead so webhook/reconciliation code can
      // still map a line item back to a catalog product.
      product_data: {
        name: `Product ${item.productId}`,
        metadata: {
          product_id: item.productId,
        },
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
      customer_email: request.customerEmail || undefined,
      metadata: {
        user_id: userId,
        order_id: orderId,
      },
      // Stamp order_id onto the PaymentIntent itself (not just the Checkout
      // Session) so payment_intent.* webhook events -- which can arrive
      // before checkout.session.completed -- can be linked back to the order.
      payment_intent_data: {
        metadata: {
          user_id: userId,
          order_id: orderId,
        },
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
