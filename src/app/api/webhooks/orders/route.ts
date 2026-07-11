import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { processOrderCommission } from '@/lib/referrals';
import { checkIdempotency, markWebhookProcessed, extractWebhookId } from '@/lib/webhooks/idempotencyManager';

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || '';

/**
 * POST /api/webhooks/orders
 * Webhook handler for order events
 * Called when a new order is placed to process referral commissions
 * Implements idempotency to prevent duplicate commission processing
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

    // Verify the signature matches Shopify's using timing-safe comparison
    const hmac = createHmac('sha256', SHOPIFY_WEBHOOK_SECRET);
    hmac.update(body, 'utf8');
    const calculatedSignature = hmac.digest('base64');

    try {
      if (!timingSafeEqual(Buffer.from(calculatedSignature), Buffer.from(signature))) {
        console.warn('Invalid webhook signature received');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } catch {
      console.warn('Invalid webhook signature received');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const { id: orderId, customer, total_price, attributes } = event;

    // Extract webhook ID for idempotency
    const webhookId = extractWebhookId('orders', request.headers);
    if (!webhookId) {
      console.warn('Missing webhook ID for idempotency check');
      return NextResponse.json({ error: 'Missing webhook ID' }, { status: 400 });
    }

    // Check for duplicate processing
    const idempotencyCheck = await checkIdempotency('orders', webhookId);
    if (idempotencyCheck.isDuplicate) {
      console.log(`[Idempotent] Duplicate order webhook detected (${webhookId})`);
      return NextResponse.json({
        success: true,
        message: 'Webhook already processed',
        idempotent: true,
      });
    }

    // Skip if no customer (guest checkout)
    if (!customer) {
      console.log(`Guest order received (${webhookId}), no referral processing needed`);
      const result = { success: true, message: 'Guest order, no referral processing' };
      await markWebhookProcessed('orders', webhookId, result);
      return NextResponse.json(result);
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

        const result = { success: true, message: 'Commission processed', orderId };
        await markWebhookProcessed('orders', webhookId, result);
        return NextResponse.json(result);
      } catch (error) {
        console.error('Error processing order commission:', error);
        const result = {
          success: false,
          message: `Commission processing failed: ${error instanceof Error ? error.message : String(error)}`,
          orderId,
        };
        await markWebhookProcessed('orders', webhookId, result);
        // Return 200 to acknowledge receipt even though processing failed
        return NextResponse.json({
          success: true,
          message: 'Order received (commission processing failed)',
        });
      }
    }

    const result = { success: true, message: 'No referral for this order' };
    await markWebhookProcessed('orders', webhookId, result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error handling order webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
