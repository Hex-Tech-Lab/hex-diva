import { Redis } from '@upstash/redis';
import { getSupabaseAdmin } from '@/lib/db';
import type { OrderLineItem } from '@/lib/stripe/types';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const INVENTORY_CACHE_TTL = 300; // 5 minutes

interface InventoryCheckResult {
  available: boolean;
  currentQuantity: number;
}

export async function getInventory(productId: string): Promise<number | null> {
  const cacheKey = `inventory:${productId}`;

  // Check cache first
  const cached = await redis.get<number>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Fetch from database
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('products')
    .select('inventory')
    .eq('id', productId)
    .single();

  if (error || !data) {
    console.error(`Failed to fetch inventory for product ${productId}:`, error);
    return null;
  }

  const quantity = data.inventory || 0;

  // Cache the result
  await redis.setex(cacheKey, INVENTORY_CACHE_TTL, quantity);

  return quantity;
}

export async function checkInventory(
  items: OrderLineItem[]
): Promise<InventoryCheckResult> {
  // Check all items have sufficient inventory
  for (const item of items) {
    const quantity = await getInventory(item.product_id);

    if (quantity === null || quantity < item.quantity) {
      return {
        available: false,
        currentQuantity: quantity || 0,
      };
    }
  }

  return {
    available: true,
    currentQuantity: 0,
  };
}

export async function decrementInventory(
  items: OrderLineItem[]
): Promise<boolean> {
  const supabase = getSupabaseAdmin() as any;

  try {
    // Decrement inventory for all items using atomic RPC function
    for (const item of items) {
      const { error } = await supabase.rpc('decrement_product_inventory', {
        product_id: item.product_id,
        quantity: item.quantity,
      });

      if (error) {
        console.error(
          `Failed to decrement inventory for product ${item.product_id}:`,
          error
        );
        return false;
      }

      // Invalidate cache for this product
      const cacheKey = `inventory:${item.product_id}`;
      await redis.del(cacheKey);
    }

    return true;
  } catch (error) {
    console.error('Error decrementing inventory:', error);
    return false;
  }
}

export async function restoreInventory(items: OrderLineItem[]): Promise<boolean> {
  const supabase = getSupabaseAdmin() as any;

  try {
    // Restore inventory if order failed using atomic RPC function
    for (const item of items) {
      const { error } = await supabase.rpc('increment_product_inventory', {
        product_id: item.product_id,
        quantity: item.quantity,
      });

      if (error) {
        console.error(
          `Failed to restore inventory for product ${item.product_id}:`,
          error
        );
        return false;
      }

      // Invalidate cache
      const cacheKey = `inventory:${item.product_id}`;
      await redis.del(cacheKey);
    }

    return true;
  } catch (error) {
    console.error('Error restoring inventory:', error);
    return false;
  }
}

export async function invalidateInventoryCache(productId: string): Promise<void> {
  const cacheKey = `inventory:${productId}`;
  await redis.del(cacheKey);
}
