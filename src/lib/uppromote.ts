/**
 * UpPromote Affiliate Platform Integration
 * Handles commission tracking, referral code management, and payout orchestration
 * Free tier: 200 orders/month
 */

import * as Sentry from '@sentry/nextjs';

const UPPROMOTE_API_KEY = process.env.UPPROMOTE_API_KEY || '';
const UPPROMOTE_API_URL = process.env.UPPROMOTE_API_URL || 'https://app.uppromote.com/api/v1';
const UPPROMOTE_WEBHOOK_SECRET = process.env.UPPROMOTE_WEBHOOK_SECRET || '';

/**
 * UpPromote API Error
 */
export class UpPromoteError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'UpPromoteError';
  }
}

/**
 * UpPromote Commission Tier Mapping
 */
export interface CommissionTierRule {
  name: 'starter' | 'growth' | 'elite' | 'vip';
  minMonthlyRevenue: number;
  commissionPercent: number;
  payoutFrequency: 'monthly' | 'weekly' | 'twice_weekly';
}

export const COMMISSION_TIERS: CommissionTierRule[] = [
  {
    name: 'starter',
    minMonthlyRevenue: 0,
    commissionPercent: 7,
    payoutFrequency: 'monthly',
  },
  {
    name: 'growth',
    minMonthlyRevenue: 5000, // EGP
    commissionPercent: 10,
    payoutFrequency: 'weekly',
  },
  {
    name: 'elite',
    minMonthlyRevenue: 20000, // EGP
    commissionPercent: 12,
    payoutFrequency: 'weekly',
  },
  {
    name: 'vip',
    minMonthlyRevenue: 50000, // EGP
    commissionPercent: 0, // Custom per partner
    payoutFrequency: 'twice_weekly',
  },
];

/**
 * UpPromote API Response Types
 */
export interface UpPromoteAffiliate {
  id: string;
  email: string;
  name: string;
  referralCode: string;
  commission: number; // Percent
  status: 'active' | 'inactive' | 'pending';
  monthlyRevenue: number;
  totalEarnings: number;
  pendingEarnings: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpPromoteOrder {
  id: string;
  affiliateId: string;
  orderId: string;
  amount: number;
  commission: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface UpPromoteWebhookPayload {
  event: string;
  timestamp: number;
  data: any;
  hmac?: string;
}

/**
 * UpPromote API Client
 */
export class UpPromoteClient {
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string = UPPROMOTE_API_KEY, apiUrl: string = UPPROMOTE_API_URL) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;

    if (!this.apiKey) {
      console.warn('[UpPromote] API key not configured. Set UPPROMOTE_API_KEY environment variable.');
    }
  }

  /**
   * Make authenticated API request to UpPromote
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.apiUrl}${path}`;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'User-Agent': 'HexDiva/1.0',
      };

      const options: RequestInit = {
        method,
        headers,
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new UpPromoteError(
          errorData.code || 'API_ERROR',
          errorData.message || `API request failed: ${response.statusText}`,
          response.status,
          errorData
        );
        Sentry.captureException(error);
        throw error;
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof UpPromoteError) {
        throw error;
      }
      const err = new UpPromoteError(
        'NETWORK_ERROR',
        `Failed to communicate with UpPromote API: ${(error as Error).message}`,
        undefined,
        error
      );
      Sentry.captureException(err);
      throw err;
    }
  }

  /**
   * Create or link an affiliate
   */
  async createAffiliate(data: {
    email: string;
    name: string;
    referralCode: string;
    commission?: number; // Percent, default 7
  }): Promise<UpPromoteAffiliate> {
    return this.request<UpPromoteAffiliate>('POST', '/affiliates', {
      email: data.email,
      name: data.name,
      referralCode: data.referralCode,
      commission: data.commission || 7,
    });
  }

  /**
   * Get affiliate by ID
   */
  async getAffiliate(affiliateId: string): Promise<UpPromoteAffiliate> {
    return this.request<UpPromoteAffiliate>('GET', `/affiliates/${affiliateId}`);
  }

  /**
   * Get affiliate by referral code
   */
  async getAffiliateByCode(referralCode: string): Promise<UpPromoteAffiliate> {
    return this.request<UpPromoteAffiliate>('GET', `/affiliates/code/${referralCode}`);
  }

  /**
   * Update affiliate commission rate
   */
  async updateAffiliateCommission(
    affiliateId: string,
    commission: number,
    reason?: string
  ): Promise<UpPromoteAffiliate> {
    return this.request<UpPromoteAffiliate>('PUT', `/affiliates/${affiliateId}/commission`, {
      commission,
      reason: reason || 'Tier upgrade',
    });
  }

  /**
   * Get affiliate's orders
   */
  async getAffiliateOrders(
    affiliateId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
    }
  ): Promise<{ data: UpPromoteOrder[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.status) params.append('status', options.status);

    const query = params.toString();
    const path = `/affiliates/${affiliateId}/orders${query ? `?${query}` : ''}`;

    return this.request<{ data: UpPromoteOrder[]; total: number }>('GET', path);
  }

  /**
   * Attribute order to affiliate
   */
  async attributeOrder(data: {
    affiliateId: string;
    orderId: string;
    amount: number;
    referralCode: string;
  }): Promise<UpPromoteOrder> {
    return this.request<UpPromoteOrder>('POST', '/orders/attribute', {
      affiliateId: data.affiliateId,
      orderId: data.orderId,
      amount: data.amount,
      referralCode: data.referralCode,
    });
  }

  /**
   * Approve a pending commission
   */
  async approveCommission(orderId: string): Promise<UpPromoteOrder> {
    return this.request<UpPromoteOrder>('PUT', `/orders/${orderId}/approve`);
  }

  /**
   * Reject a pending commission
   */
  async rejectCommission(orderId: string, reason?: string): Promise<UpPromoteOrder> {
    return this.request<UpPromoteOrder>('PUT', `/orders/${orderId}/reject`, {
      reason: reason || 'Admin decision',
    });
  }

  /**
   * Process payout for affiliate
   */
  async processPayout(data: {
    affiliateId: string;
    amount: number;
    paymentMethod: 'bank_transfer' | 'stripe' | 'paypal';
    reference?: string;
  }): Promise<any> {
    return this.request<any>('POST', '/payouts', {
      affiliateId: data.affiliateId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      reference: data.reference,
    });
  }

  /**
   * Get affiliate statistics
   */
  async getAffiliateStats(affiliateId: string): Promise<any> {
    return this.request<any>('GET', `/affiliates/${affiliateId}/stats`);
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string = UPPROMOTE_WEBHOOK_SECRET
  ): boolean {
    if (!secret) {
      console.warn('[UpPromote] Webhook secret not configured');
      return false;
    }

    const crypto = require('crypto');
    const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    try {
      // Use timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
    } catch {
      // timingSafeEqual throws if lengths differ, treat as invalid
      return false;
    }
  }

  /**
   * Parse webhook payload
   */
  static parseWebhookPayload(payload: string): UpPromoteWebhookPayload {
    try {
      return JSON.parse(payload) as UpPromoteWebhookPayload;
    } catch (error) {
      throw new UpPromoteError('INVALID_PAYLOAD', 'Failed to parse webhook payload', undefined, error);
    }
  }
}

/**
 * Determine commission tier based on monthly revenue
 */
export function determineCommissionTier(monthlyRevenueEGP: number): CommissionTierRule {
  const tier = COMMISSION_TIERS.sort((a, b) => b.minMonthlyRevenue - a.minMonthlyRevenue).find(
    (t) => monthlyRevenueEGP >= t.minMonthlyRevenue
  );

  return tier ?? (COMMISSION_TIERS[0] as CommissionTierRule); // Default to Starter
}

/**
 * Calculate commission amount
 */
export function calculateCommission(saleAmount: number, commissionPercent: number): number {
  return Math.round((saleAmount * commissionPercent) / 100 * 100) / 100;
}

/**
 * Format referral code for display (AB1234 → AB-1234)
 */
export function formatReferralCodeDisplay(code: string): string {
  const cleaned = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length !== 6) return code;
  return `${cleaned.substring(0, 2)}-${cleaned.substring(2)}`;
}

/**
 * Singleton instance
 */
export const uppromoteClient = new UpPromoteClient();

export default uppromoteClient;
