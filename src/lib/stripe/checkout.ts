import { stripe } from './client';
import type { CheckoutSessionRequest } from './types';

export async function createCheckoutSession(request: CheckoutSessionRequest) {
  const { cart, successUrl, cancelUrl, idempotencyKey, orderId } = request;

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
        order_id: orderId,
      },
      // Stamp order_id onto the PaymentIntent itself (not just the Checkout
      // Session) so payment_intent.* webhook events -- which can arrive
      // before checkout.session.completed -- can be linked back to the order.
      payment_intent_data: {
        metadata: {
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
