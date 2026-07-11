import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { processOrderCommission } from '@/lib/referrals';

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || '';

/**
 * POST /api/webhooks/orders
 * Webhook handler for order events
 * Called when a new order is placed to process referral commissions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-shopify-hmac-sha256');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      );
    }

    if (!SHOPIFY_WEBHOOK_SECRET) {
      console.error('SHOPIFY_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Server misconfiguration' },
        { status: 500 }
      );
    }

    // Verify the signature matches Shopify's
    const hmac = createHmac('sha256', SHOPIFY_WEBHOOK_SECRET);
    hmac.update(body, 'utf8');
    const calculatedSignature = hmac.digest('base64');

    if (calculatedSignature !== signature) {
      console.warn('Invalid webhook signature received');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const { id: orderId, customer, total_price, attributes } = event;

    // Skip if no customer (guest checkout)
    if (!customer) {
      return NextResponse.json({
        success: true,
        message: 'Guest order, no referral processing',
      });
    }

    // Check if there's a referral token in the order metadata
    let referralToken = null;
    if (attributes && Array.isArray(attributes)) {
      const refAttr = attributes.find((attr: any) => attr.name === 'referral_code');
      if (refAttr) {
        referralToken = refAttr.value;
      }
    }

    // Process commission
    if (referralToken) {
      try {
        await processOrderCommission(
          '', // Will be filled from referral token lookup
          orderId,
          parseFloat(total_price)
        );

        return NextResponse.json({
          success: true,
          message: 'Commission processed',
        });
      } catch (error) {
        console.error('Error processing order commission:', error);
        // Don't fail the webhook - log and continue
        return NextResponse.json({
          success: true,
          message: 'Order received (commission processing failed)',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'No referral for this order',
    });
  } catch (error) {
    console.error('Error handling order webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
