export interface PayTabsCustomerDetails {
  name: string;
  email: string;
  phone: string;
  street1: string;
  city: string;
  state: string;
  country: string;
  zip?: string;
  ip?: string;
}

export interface PayTabsCheckoutRequest {
  /** Internal order UUID; used as cart_id and stamped into user_defined for webhook lookup */
  orderId: string;
  cartAmount: number;
  cartCurrency: string;
  cartDescription: string;
  customer: PayTabsCustomerDetails;
  returnUrl: string;
  callbackUrl: string;
}

/** Response shape from POST {baseUrl}/payment/request */
export interface PayTabsCheckoutResponse {
  tran_ref: string;
  redirect_url: string;
  cart_id: string;
  cart_amount: string;
  cart_currency: string;
}

/** IPN/webhook callback payload PayTabs POSTs to callbackUrl */
export interface PayTabsWebhookPayload {
  tran_ref: string;
  tran_type: string;
  cart_id: string;
  cart_amount: string;
  cart_currency: string;
  payment_result: {
    response_status: 'A' | 'D' | 'E' | 'P' | 'V'; // Authorized/Declined/Error/Pending/Voided
    response_code: string;
    response_message: string;
  };
  [key: string]: unknown;
}
