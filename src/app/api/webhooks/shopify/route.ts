import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { invalidateProductCache, invalidateProductInventory } from '@/lib/cache';

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || '';

/**
 * Verify Shopify webhook signature
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

  return hash === hmacHeader;
}

/**
 * Handle product updates from Shopify
 */
async function handleProductUpdate(shopifyProduct: any) {
  try {
    const { id: shopify_id, title, body_html: description, variants, images } = shopifyProduct;

    // Update or create product in Supabase
    const { data: existingProduct } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('shopify_id', `gid://shopify/Product/${shopify_id}`)
      .single();

    const productData = {
      shopify_id: `gid://shopify/Product/${shopify_id}`,
      name: title,
      description: description?.replace(/<[^>]*>/g, '') || '',
      image_url: images?.[0]?.src || null,
      in_stock: variants?.some((v: any) => v.inventory_quantity > 0) || false,
      inventory: variants?.reduce((sum: number, v: any) => sum + (v.inventory_quantity || 0), 0) || 0,
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
        .single();
      productId = newProduct?.id;
    }

    // Update variants
    if (productId && variants) {
      for (const variant of variants) {
        await supabaseAdmin.from('product_variants').upsert({
          product_id: productId,
          shopify_variant_id: `gid://shopify/ProductVariant/${variant.id}`,
          sku: variant.sku,
          title: variant.title,
          price: parseFloat(variant.price),
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
async function handleInventoryUpdate(inventoryUpdate: any) {
  try {
    const { product_id, variant_id, quantity } = inventoryUpdate;

    // Find product by Shopify ID
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('shopify_id', `gid://shopify/Product/${product_id}`)
      .single();

    if (product) {
      // Update variant inventory
      await supabaseAdmin
        .from('product_variants')
        .update({ inventory_quantity: quantity })
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
 * Webhook endpoint for Shopify events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Verify webhook signature
    if (!verifyWebhookSignature(request, body)) {
      console.warn('Invalid Shopify webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const topic = request.headers.get('x-shopify-topic');

    console.log(`Received Shopify webhook: ${topic}`);

    // Route to appropriate handler
    switch (topic) {
      case 'products/update':
        await handleProductUpdate(event);
        break;
      case 'inventory_levels/update':
        await handleInventoryUpdate(event);
        break;
      case 'products/delete':
        // Handle product deletion
        console.log(`Product deleted: ${event.id}`);
        break;
      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
