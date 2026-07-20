import { getPayTabsConfig } from './client';
import type { PayTabsCheckoutRequest, PayTabsCheckoutResponse } from './types';

/**
 * Create a PayTabs Hosted Payment Page session.
 * https://docs.paytabs.com -- POST {baseUrl}/payment/request
 *
 * tran_class 'ecom' + tran_type 'sale' is a standard one-shot card charge.
 * cart_id is set to the order UUID so the webhook handler can look the
 * order up directly without a separate mapping table.
 */
export async function createPayTabsCheckoutSession(
  request: PayTabsCheckoutRequest
): Promise<PayTabsCheckoutResponse> {
  const config = getPayTabsConfig();

  const response = await fetch(`${config.baseUrl}/payment/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: config.serverKey,
    },
    body: JSON.stringify({
      profile_id: config.profileId,
      tran_type: 'sale',
      tran_class: 'ecom',
      cart_id: request.orderId,
      cart_currency: request.cartCurrency,
      cart_amount: request.cartAmount,
      cart_description: request.cartDescription,
      customer_details: {
        name: request.customer.name,
        email: request.customer.email,
        phone: request.customer.phone,
        street1: request.customer.street1,
        city: request.customer.city,
        state: request.customer.state,
        country: request.customer.country,
        zip: request.customer.zip,
        ip: request.customer.ip,
      },
      return: request.returnUrl,
      callback: request.callbackUrl,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PayTabs checkout session creation failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as PayTabsCheckoutResponse;

  if (!data.redirect_url) {
    throw new Error(`PayTabs response missing redirect_url: ${JSON.stringify(data)}`);
  }

  return data;
}
