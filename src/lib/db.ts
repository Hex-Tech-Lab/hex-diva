import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

class SupabaseInitializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseInitializationError';
  }
}

function validateEnvironment(): void {
  if (!supabaseUrl || !supabaseKey) {
    throw new SupabaseInitializationError(
      'Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set'
    );
  }
}

/**
 * Create a new request-scoped Supabase client (Law #2 compliance)
 * Each call creates a fresh instance to guarantee RLS context isolation
 * Uses anonymous key for client-side operations with row-level security
 * @returns New SupabaseClient instance for this request
 * @throws SupabaseInitializationError if required environment variables missing
 */
export function getSupabase(options?: any): SupabaseClient<Database> {
  validateEnvironment();
  return createClient<Database>(supabaseUrl!, supabaseKey!, options);
}

/**
 * Create a new request-scoped Supabase admin client (Law #2 compliance)
 * Each call creates a fresh instance for admin operations with RLS bypass
 * Uses service role key for admin operations (sensitive data access)
 * @returns New SupabaseClient instance with admin privileges
 * @throws SupabaseInitializationError if required environment variables missing
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  validateEnvironment();
  if (!supabaseServiceKey) {
    throw new SupabaseInitializationError(
      'Missing Supabase admin configuration: SUPABASE_SERVICE_ROLE_KEY must be set'
    );
  }
  return createClient<Database>(supabaseUrl!, supabaseServiceKey);
}

/**
 * Deprecated: Use getSupabase() instead
 * Kept for backwards compatibility during migration
 * WARNING: Creates new instances on each access - use getSupabase() directly
 */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get: (_target, prop) => {
    return (getSupabase() as unknown as Record<PropertyKey, unknown>)[prop];
  },
}) as SupabaseClient<Database>;

/**
 * Deprecated: Use getSupabaseAdmin() instead
 * Kept for backwards compatibility during migration
 * WARNING: Creates new instances on each access - use getSupabaseAdmin() directly
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get: (_target, prop) => {
    return (getSupabaseAdmin() as unknown as Record<PropertyKey, unknown>)[prop];
  },
}) as SupabaseClient<Database>;

// Export types for convenience
export type { User, Session } from '@supabase/supabase-js';

/**
 * Typed database operations for common queries
 */
export const db = {
  /**
   * Get user by ID with profile
   */
  async getUserProfile(userId: string, client: SupabaseClient = supabase) {
    const { data, error } = await client
      .from('users')
      .select(`
        *,
        user_profiles(*),
        addresses(*)
      `)
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create user profile
   */
  async createUserProfile(
    userId: string,
    profile: Record<string, any>,
    client: SupabaseClient = supabaseAdmin
  ) {
    const { data, error } = await client.from('user_profiles').insert({
      user_id: userId,
      ...profile,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Get products with filters
   */
  async getProducts(
    filters?: {
      category?: string;
      brand?: string;
      minPrice?: number;
      maxPrice?: number;
      search?: string;
      limit?: number;
      offset?: number;
    },
    client: SupabaseClient = supabase
  ) {
    let query = client.from('products').select('*');

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.brand) {
      query = query.eq('brand', filters.brand);
    }
    if (filters?.minPrice) {
      query = query.gte('price', filters.minPrice);
    }
    if (filters?.maxPrice) {
      query = query.lte('price', filters.maxPrice);
    }
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    return { products: data, count };
  },

  /**
   * Get product by ID with reviews
   */
  async getProduct(productId: string, client: SupabaseClient = supabase) {
    const { data, error } = await client
      .from('products')
      .select(`
        *,
        product_reviews(*)
      `)
      .eq('id', productId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get user orders
   */
  async getUserOrders(userId: string, client: SupabaseClient = supabase) {
    const { data, error } = await client
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          products(*)
        ),
        addresses(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Get user referrals
   */
  async getUserReferrals(userId: string, client: SupabaseClient = supabase) {
    const { data, error } = await client
      .from('referrals')
      .select(`
        *,
        referred_user:referred_user_id(id, email, display_name)
      `)
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Get user commissions
   */
  async getUserCommissions(userId: string, client: SupabaseClient = supabase) {
    const { data, error } = await client
      .from('commissions')
      .select(`
        *,
        orders(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Create order
   */
  async createOrder(
    userId: string,
    orderData: Record<string, any>,
    client: SupabaseClient = supabaseAdmin
  ) {
    const { data, error } = await client
      .from('orders')
      .insert({
        user_id: userId,
        ...orderData,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Add order items
   */
  async addOrderItems(
    orderId: string,
    items: any[],
    client: SupabaseClient = supabaseAdmin
  ) {
    const { data, error } = await client
      .from('order_items')
      .insert(
        items.map((item) => ({
          order_id: orderId,
          ...item,
        }))
      );

    if (error) throw error;
    return data;
  },

  /**
   * Update product inventory
   */
  async updateInventory(
    productId: string,
    quantity: number,
    client: SupabaseClient = supabaseAdmin
  ) {
    const { data, error } = await client
      .from('inventory_cache')
      .update({
        quantity_available: quantity,
        last_synced_at: new Date().toISOString(),
      })
      .eq('product_id', productId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Log audit event
   */
  async logAudit(
    action: string,
    resourceType: string,
    resourceId?: string,
    changes?: any,
    client: SupabaseClient = supabaseAdmin
  ) {
    const user = await supabase.auth.getUser();
    const { data, error } = await client.from('audit_logs').insert({
      user_id: user.data.user?.id,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      changes,
    });

    if (error) {
      console.error('Audit log error:', error);
    }
    return data;
  },
};

/**
 * Helper to check admin status
 */
export async function isAdmin(userId: string, client: SupabaseClient = supabase) {
  const { data, error } = await client
    .from('admin_users')
    .select('role')
    .eq('user_id', userId)
    .single();

  return !error && data !== null;
}
