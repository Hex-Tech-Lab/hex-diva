/**
 * Paymob Payouts (Instant Cashin API) client.
 * Disburses funds to bank accounts/IBANs or mobile wallets (Vodafone Cash,
 * Etisalat, Orange). InstaPay is not yet live on Paymob's payout product —
 * add as an `issuer` value once Paymob ships it, no shape change needed.
 * Docs: https://payouts.paymobsolutions.com/docs/instant_cashin_api/
 */

export type PaymobDisbursementIssuer =
  | 'vodafone'
  | 'etisalat'
  | 'orange'
  | 'bank_wallet'
  | 'bank_card'
  | 'instant_bank'
  | 'aman';

export interface PaymobBankRecipient {
  issuer: 'instant_bank' | 'bank_card' | 'bank_wallet';
  fullName: string;
  bankCode?: string;
  /** Local account number (6-20 digits) or Egyptian IBAN (EG + 27 digits). */
  accountNumber: string;
}

export interface PaymobWalletRecipient {
  issuer: 'vodafone' | 'etisalat' | 'orange';
  fullName: string;
  msisdn: string;
}

export type PaymobDisbursementRecipient = PaymobBankRecipient | PaymobWalletRecipient;

export interface PaymobDisbursementRequest {
  amountEGP: number;
  recipient: PaymobDisbursementRecipient;
  /** Caller-supplied idempotency key, e.g. `payout_${payoutId}`. */
  referenceId: string;
}

export interface PaymobDisbursementResult {
  success: boolean;
  transactionId?: string;
  status?: 'pending' | 'success' | 'failed';
  error?: string;
}

function getPaymobPayoutsConfig() {
  const apiKey = process.env.PAYMOB_PAYOUTS_API_KEY;
  const baseUrl = process.env.PAYMOB_PAYOUTS_BASE_URL || 'https://payouts.paymobsolutions.com/api';
  if (!apiKey) {
    throw new Error('PAYMOB_PAYOUTS_API_KEY is not configured');
  }
  return { apiKey, baseUrl };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAuthToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const { apiKey, baseUrl } = getPaymobPayoutsConfig();
  const response = await fetch(`${baseUrl}/secure/mini/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  });

  if (!response.ok) {
    throw new Error(`Paymob payouts auth failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const token = data.token as string;
  cachedToken = { token, expiresAt: Date.now() + 45 * 60 * 1000 };
  return token;
}

/**
 * Disburse a single payment to a bank account/IBAN or mobile wallet.
 * Amount is in EGP; converted to piastres for the API call.
 */
export async function createPaymobDisbursement(
  request: PaymobDisbursementRequest
): Promise<PaymobDisbursementResult> {
  const { baseUrl } = getPaymobPayoutsConfig();
  const token = await getAuthToken();

  const { recipient } = request;
  const payload: Record<string, unknown> = {
    amount: Math.round(request.amountEGP * 100),
    issuer: recipient.issuer,
    full_name: recipient.fullName,
    reference_id: request.referenceId,
  };

  if ('msisdn' in recipient) {
    payload.msisdn = recipient.msisdn;
  } else {
    payload.account_number = recipient.accountNumber;
    if (recipient.bankCode) payload.bank_code = recipient.bankCode;
  }

  const response = await fetch(`${baseUrl}/secure/mini/disburse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      error: data?.message || `Paymob disbursement failed: ${response.status}`,
    };
  }

  return {
    success: true,
    transactionId: data.transaction_id || data.id,
    status: data.status ?? 'pending',
  };
}
