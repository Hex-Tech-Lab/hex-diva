import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db';
import { invalidateProductCache, invalidateProductInventory } from '@/lib/cache';
import { checkIdempotency, markWebhookProcessed, extractWebhookId } from '@/lib/webhooks/idempotencyManager';
import type { ProductRecord } from '@/types/database.types';

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || '';

/**
 * Verify Shopify webhook signature using timing-safe comparison
 */
function verifyWebhookSignature(
  request: NextRequest,
  body: string
): boolean {
  const hmacHeader = request.headers.get('x-shopify-hmac-sha256');
  if (!hmacHeader) return false;

  const hash = createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

interface ShopifyProduct {
  id: string | number
  title: string
  body_html?: string
  images?: Array<{ src?: string }>
  variants?: Array<{
    id: string | number
    sku?: string
    title?: string
    price?: string | number
    inventory_quantity?: number
    image?: { src?: string }
  }>
}

interface ShopifyInventoryUpdate {
  product_id: string | number
  variant_id: string | number
  quantity: number
}

/**
 * Handle product updates from Shopify
 */
async function handleProductUpdate(shopifyProduct: ShopifyProduct, supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) {
  try {
    const { id: shopify_id, title, body_html: description, variants, images } = shopifyProduct;

    // Update or create product in Supabase
    const { data: existingProduct } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('shopify_id', `gid://shopify/Product/${shopify_id}`)
      .single<ProductRecord>();

    const productData = {
      shopify_id: `gid://shopify/Product/${shopify_id}`,
      title: title,
      description: description?.replace(/<[^>]*>/g, '') || null,
      image_url: images?.[0]?.src || null,
      inventory_quantity: variants?.reduce((sum: number, v) => sum + (v.inventory_quantity || 0), 0) || 0,
      price: variants?.[0]?.price ? parseFloat(String(variants[0].price)) : 0,
      status: 'active',
    };

    let productId: string;

    if (existingProduct) {
      await supabaseAdmin
        .from('products')
        .update(productData)
        .eq('id', existingProduct.id);
      productId = existingProduct.id;
    } else {
      const { data: newProduct } = await supabaseAdmin
        .from('products')
        .insert(productData)
        .select('id')
        .single<ProductRecord>();
      productId = newProduct?.id || '';
    }

    // Update variants
    if (productId && variants) {
      for (const variant of variants) {
        await supabaseAdmin.from('product_variants').upsert({
          product_id: productId,
          shopify_variant_id: `gid://shopify/ProductVariant/${variant.id}`,
          sku: variant.sku || null,
          title: variant.title || null,
          price: variant.price ? parseFloat(String(variant.price)) : null,
          inventory_quantity: variant.inventory_quantity || 0,
          image_url: variant.image?.src || null,
        });
      }
    }

    // Invalidate cache
    if (productId) {
      await invalidateProductCache(productId);
      await invalidateProductInventory(productId);
    }

    console.log(`Updated product: ${title} (${shopify_id})`);
  } catch (error) {
    console.error('Error handling product update:', error);
    throw error;
  }
}

/**
 * Handle inventory updates from Shopify
 */
async function handleInventoryUpdate(inventoryUpdate: ShopifyInventoryUpdate, supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) {
  try {
    const { product_id, variant_id, quantity } = inventoryUpdate;

    // Find product by Shopify ID
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('shopify_id', `gid://shopify/Product/${product_id}`)
      .single<ProductRecord>();

    if (product) {
      // Update variant inventory
      await supabaseAdmin
        .from('product_variants')
        .update({ inventory_quantity: quantity, updated_at: new Date().toISOString() })
        .eq('shopify_variant_id', `gid://shopify/ProductVariant/${variant_id}`);

      // Invalidate cache
      await invalidateProductInventory(product.id);
      console.log(`Updated inventory for variant ${variant_id}: ${quantity}`);
    }
  } catch (error) {
    console.error('Error handling inventory update:', error);
    throw error;
  }
}

/**
 * POST /api/webhooks/shopify
 * Webhook endpoint for Shopify events (product/inventory updates)
 * Implements idempotency to prevent duplicate processing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const supabaseAdmin = getSupabaseAdmin();

    // Verify webhook signature
    if (!verifyWebhookSignature(request, body)) {
      console.warn('Invalid Shopify webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const topic = request.headers.get('x-shopify-topic');

    // Extract webhook ID for idempotency
    const webhookId = extractWebhookId('shopify', request.headers);
    if (!webhookId) {
      console.warn('Missing webhook ID for idempotency check');
      return NextResponse.json({ error: 'Missing webhook ID' }, { status: 400 });
    }

    // Check for duplicate processing
    const idempotencyCheck = await checkIdempotency('shopify', webhookId);
    if (idempotencyCheck.isDuplicate) {
      console.log(`[Idempotent] Duplicate Shopify webhook detected: ${topic} (${webhookId})`);
      return NextResponse.json({
        success: true,
        message: 'Webhook already processed',
        idempotent: true,
      });
    }

    console.log(`Received Shopify webhook: ${topic} (${webhookId})`);

    let processingResult = { success: true, message: 'Webhook processed' };

    try {
      // Route to appropriate handler
      switch (topic) {
        case 'products/update':
          await handleProductUpdate(event, supabaseAdmin);
          break;
        case 'inventory_levels/update':
          await handleInventoryUpdate(event, supabaseAdmin);
          break;
        case 'products/delete':
          console.log(`Product deleted: ${event.id}`);
          break;
        default:
          console.log(`Unhandled webhook topic: ${topic}`);
      }

      // Mark webhook as processed
      await markWebhookProcessed('shopify', webhookId, processingResult);
      return NextResponse.json({ success: true });
    } catch (handlerError) {
      console.error(`Error processing Shopify webhook (${topic}):`, handlerError);
      return NextResponse.json(
        { error: 'Error processing webhook' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Shopify webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
