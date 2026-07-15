/**
 * Settings Repository (Law #2: Request-Scoped Supabase Client)
 * Reads/writes platform settings backed by platform_settings table and Redis cache (5m TTL)
 */

import { getSupabaseAdmin } from '@/lib/db';
import { getCached, setCached, deleteCached } from '@/lib/cache';
import { FullSettingsSchema, type FullSettings } from './settingsContracts';
import { SETTINGS as DefaultSettings } from '@/config/settings';

const CACHE_PREFIX = 'platform_setting:';
const CACHE_TTL = 300; // 5 minutes

export class SettingsRepository {
  /**
   * Get setting by key. Fall back to DefaultSettings if not present in DB.
   */
  static async getSetting<K extends keyof FullSettings>(section: K): Promise<FullSettings[K]> {
    const cacheKey = `${CACHE_PREFIX}${section}`;
    
    // 1. Try cache
    const cached = await getCached<FullSettings[K]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Try DB
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', section)
      .single();

    if (error || !data) {
      // Return default/seed setting
      const val = DefaultSettings[section] as FullSettings[K];
      // Seed the cache anyway
      await setCached(cacheKey, val, CACHE_TTL);
      return val;
    }

    const value = data.value as FullSettings[K];
    await setCached(cacheKey, value, CACHE_TTL);
    return value;
  }

  /**
   * Get all settings merged with defaults
   */
  static async getAllSettings(): Promise<FullSettings> {
    const keys: (keyof FullSettings)[] = [
      'payment',
      'b2b',
      'b2c',
      'affiliate',
      'logistics',
      'shopify',
      'marketplace',
      'env'
    ];

    const result = {} as FullSettings;
    await Promise.all(
      keys.map(async (key) => {
        const val = await this.getSetting(key);
        (result as any)[key] = val;
      })
    );

    return result;
  }

  /**
   * Upsert a settings section in the database, validating with Zod and invalidating cache.
   */
  static async updateSetting<K extends keyof FullSettings>(
    section: K,
    value: FullSettings[K],
    updatedBy: string
  ): Promise<void> {
    // 1. Validate against contract
    const schema = (FullSettingsSchema.shape as any)[section];
    if (!schema) {
      throw new Error(`Invalid settings section: ${section}`);
    }
    schema.parse(value);

    // 2. Save to DB
    const supabase = getSupabaseAdmin();
    
    // Get current version to increment or default to 1
    const { data: current } = await supabase
      .from('platform_settings')
      .select('version')
      .eq('key', section)
      .single();

    const nextVersion = current ? (current.version || 1) + 1 : 1;

    const { error } = await supabase
      .from('platform_settings')
      .upsert({
        key: section,
        section,
        value: value as any,
        version: nextVersion,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to update platform setting in DB: ${error.message}`);
    }

    // 3. Invalidate Cache
    const cacheKey = `${CACHE_PREFIX}${section}`;
    await deleteCached(cacheKey);
  }
}
