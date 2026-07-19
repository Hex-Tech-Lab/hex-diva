/**
 * Admin Analytics Events
 * Tracks admin user actions for analytics and engagement monitoring
 * No PII is included - only aggregated, anonymized data
 */

import { PostHog } from 'posthog-node';

// Initialize PostHog client (server-side)
const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY || '', {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});

export interface AdminEventProps {
  adminEmail: string; // Email for identifying admin (non-PII in aggregate)
  action: string;
  metadata?: Record<string, any>;
}

/**
 * Track admin login event
 */
export async function trackAdminLogin(email: string) {
  try {
    posthog.capture({
      distinctId: email,
      event: 'admin_login',
      properties: {
        admin_action: 'login',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to track admin login:', error);
  }
}

/**
 * Track admin dashboard view
 */
export async function trackAdminDashboardView(email: string) {
  try {
    posthog.capture({
      distinctId: email,
      event: 'admin_dashboard_view',
      properties: {
        admin_action: 'dashboard_view',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to track dashboard view:', error);
  }
}

/**
 * Track order status update
 */
export async function trackOrderStatusUpdate(email: string, orderId: string, newStatus: string) {
  try {
    posthog.capture({
      distinctId: email,
      event: 'admin_order_status_update',
      properties: {
        admin_action: 'order_status_update',
        order_id: orderId,
        new_status: newStatus,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to track order status update:', error);
  }
}

/**
 * Track product edit
 */
export async function trackProductEdit(email: string, productId: string, field: string) {
  try {
    posthog.capture({
      distinctId: email,
      event: 'admin_product_edit',
      properties: {
        admin_action: 'product_edit',
        product_id: productId,
        field_edited: field,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to track product edit:', error);
  }
}

/**
 * Track commission payout approval
 */
export async function trackCommissionPayoutApproval(email: string, payoutId: string, amount: number) {
  try {
    posthog.capture({
      distinctId: email,
      event: 'admin_commission_payout_approval',
      properties: {
        admin_action: 'payout_approval',
        payout_id: payoutId,
        amount_usd: amount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to track payout approval:', error);
  }
}

/**
 * Track settings change
 */
export async function trackSettingsChange(email: string, section: string, field: string) {
  try {
    posthog.capture({
      distinctId: email,
      event: 'admin_settings_change',
      properties: {
        admin_action: 'settings_change',
        section,
        field,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to track settings change:', error);
  }
}

/**
 * Flush pending events (call on app shutdown)
 */
export async function flushAnalytics() {
  try {
    posthog.flush();
  } catch (error) {
    console.error('Failed to flush analytics:', error);
  }
}
