import Stripe from 'stripe';

/**
 * Thrown when Stripe-dependent code runs without STRIPE_SECRET_KEY
 * configured. Stripe is not accessible in Egypt (the primary market) and
 * this integration is intentionally kept dormant/archived until Stripe
 * (or a replacement provider) is usable there -- see
 * docs/PAYMENT_PROVIDER_ARCHITECTURE_V2.md. Callers should catch this and
 * return a graceful "payment provider unavailable" response rather than
 * letting it crash the request -- and, critically, this must never be
 * thrown at module load time, or merely importing this file anywhere in
 * the app (even transitively) would crash the entire Next.js build.
 */
export class StripeNotConfiguredError extends Error {
  constructor() {
    super('Stripe is not configured (STRIPE_SECRET_KEY unset) -- payment processing is currently unavailable.');
    this.name = 'StripeNotConfiguredError';
  }
}

let stripeClient: Stripe | null | undefined;

/**
 * Lazily instantiate the Stripe client on first use, not at module load.
 * Throws StripeNotConfiguredError if STRIPE_SECRET_KEY is unset -- callers
 * in API routes must catch this specifically and respond with a graceful
 * 503, not let it bubble up as an unhandled build/runtime crash.
 */
export function getStripeClient(): Stripe {
  if (stripeClient === undefined) {
    stripeClient = process.env.STRIPE_SECRET_KEY
      ? new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2024-04-10',
          typescript: true,
        })
      : null;
  }

  if (!stripeClient) {
    throw new StripeNotConfiguredError();
  }

  return stripeClient;
}
