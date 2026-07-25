/**
 * Health Check: Configuration Validation
 *
 * GET /api/health/config
 * Validates all critical platform configurations at runtime.
 * Used by monitoring systems and app startup health checks.
 *
 * Response:
 * {
 *   status: 'ok' | 'degraded' | 'error',
 *   timestamp: ISO8601,
 *   configs: {
 *     payment: { valid: boolean, errors?: string[] },
 *     b2b: { valid: boolean, errors?: string[] },
 *     b2c: { valid: boolean, errors?: string[] },
 *     affiliate: { valid: boolean, errors?: string[] },
 *     logistics: { valid: boolean, errors?: string[] }
 *   },
 *   environment: 'development' | 'staging' | 'production',
 *   features: {
 *     b2bEnabled: boolean,
 *     b2cEnabled: boolean,
 *     affiliateEnabled: boolean
 *   }
 * }
 */

import { NextResponse } from 'next/server';
import { validateAllConfigs, getPaymentSettings, getAllB2BTiers, getAffiliateCommissionTiers } from '@/lib/config';
import SETTINGS from '@/config/settings';
import { checkGatewayEndpointHealth } from '@/lib/admin/shopifyPaymentGatewaySync';

export async function GET() {
  try {
    // Run comprehensive validation
    const validationResult = validateAllConfigs();

    // Determine overall status
    const hasErrors = !validationResult.valid;
    const overallStatus = hasErrors ? 'degraded' : 'ok';

    // Get environment
    const environment = process.env.NODE_ENV || 'development';

    // Attempt to load critical configs
    let paymentValid = false;
    let paymentCategoryCount = 0;
    let b2bValid = false;
    let affiliateValid = false;
    let logisticsValid = false;

    try {
      const payment = await getPaymentSettings();
      paymentCategoryCount = Object.keys(payment).length;
      paymentValid = paymentCategoryCount > 0;
    } catch {
      paymentValid = false;
    }

    try {
      getAllB2BTiers();
      b2bValid = true;
    } catch {
      b2bValid = false;
    }

    try {
      getAffiliateCommissionTiers();
      affiliateValid = true;
    } catch {
      affiliateValid = false;
    }

    // Check if 3PL configs exist
    logisticsValid = !!(SETTINGS.logistics && Object.keys(SETTINGS.logistics).length > 0);

    // Shopify's legacy REST payment_gateways.json endpoint is deprecated
    // (Oct 2024, public apps) but is what shopifyPaymentGatewaySync relies
    // on. This never throws — degrades to `configured: false` when the
    // Shopify app isn't installed yet, and flags `deprecated404: true` if
    // Shopify has since removed the endpoint outright, without affecting
    // overall health status.
    let shopifyGatewaySync: {
      configured: boolean;
      reachable: boolean;
      deprecated404: boolean;
      detail?: string;
    };
    try {
      shopifyGatewaySync = await checkGatewayEndpointHealth();
    } catch (err) {
      shopifyGatewaySync = {
        configured: false,
        reachable: false,
        deprecated404: false,
        detail: err instanceof Error ? err.message : 'Unknown error probing Shopify gateway endpoint',
      };
    }

    return NextResponse.json(
      {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        environment,
        configs: {
          payment: {
            valid: paymentValid,
            categories: paymentCategoryCount,
          },
          b2b: {
            valid: b2bValid,
            tiersCount: b2bValid ? Object.keys(getAllB2BTiers()).length : 0,
          },
          affiliate: {
            valid: affiliateValid,
            commissioning: affiliateValid ? getAffiliateCommissionTiers().length : 0,
          },
          logistics: {
            valid: logisticsValid,
          },
          shopifyPaymentGatewaySync: shopifyGatewaySync,
        },
        features: {
          b2bEnabled: SETTINGS.env.featureFlags.b2bEnabled,
          b2cEnabled: SETTINGS.env.featureFlags.b2cEnabled,
          affiliateEnabled: SETTINGS.env.featureFlags.affiliateEnabled,
          amazonIntegration: SETTINGS.env.featureFlags.amazonIntegration,
        },
        detailedErrors: hasErrors ? validationResult.errors : undefined,
      },
      {
        status: hasErrors ? 206 : 200, // 206 Partial Content if degraded, 200 OK if all good
      }
    );
  } catch (error) {
    console.error('[/api/health/config] Unexpected error:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'Unknown error during config validation',
      },
      { status: 500 }
    );
  }
}
