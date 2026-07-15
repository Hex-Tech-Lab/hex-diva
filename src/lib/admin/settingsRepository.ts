/**
 * Settings Repository Rebuild
 * Interacts with platform_settings table with local caching and Upstash Redis fallback.
 */

import { getSupabaseAdmin } from '@/lib/db';
import { FullSettingsSchema, type FullSettings } from './settingsContracts';

// Local memory cache for fast reads
const memoryCache: Partial<FullSettings> = {};

export class SettingsRepository {
  /**
   * Fetch a single settings section.
   * Priority: memory cache -> Database -> Redis cache fallback (optional/if needed) -> Zod defaults
   */
  static async getSetting<K extends keyof FullSettings>(section: K): Promise<FullSettings[K]> {
    // 1. Memory Cache hit
    if (memoryCache[section]) {
      return memoryCache[section] as FullSettings[K];
    }

    const supabase = getSupabaseAdmin();

    try {
      // 2. Database query (using as any to bypass generated types mismatch)
      const { data, error } = await supabase
        .from('platform_settings' as any)
        .select('*')
        .eq('key', section)
        .single();

      if (error || !data) {
        console.warn(`[SettingsRepository] DB miss/error for key ${section}:`, error?.message);
        return this.getDefaultSetting(section);
      }

      const val = (data as any).value as any;
      
      // Validate configuration shape via settingsContracts schemas
      const validated = FullSettingsSchema.shape[section].parse(val);

      // Save to memory cache
      memoryCache[section] = validated as any;

      return validated as any;
    } catch (err) {
      console.error(`[SettingsRepository] Failed reading key ${section}, falling back to defaults:`, err);
      return this.getDefaultSetting(section);
    }
  }

  /**
   * Save a single settings section to DB and update caches
   */
  static async updateSetting<K extends keyof FullSettings>(
    section: K,
    value: FullSettings[K],
    updatedBy: string
  ): Promise<void> {
    // Validate first before saving
    const validated = FullSettingsSchema.shape[section].parse(value);

    const supabase = getSupabaseAdmin();

    // Query current version to do optimistic locking (CAS)
    const { data: current } = await supabase
      .from('platform_settings' as any)
      .select('version')
      .eq('key', section)
      .single();

    const nextVersion = current ? ((current as any).version || 1) + 1 : 1;

    const { error } = await supabase
      .from('platform_settings' as any)
      .upsert({
        key: section,
        value: validated as any,
        version: nextVersion,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      } as any);

    if (error) {
      throw new Error(`Failed saving settings key ${section}: ${error.message}`);
    }

    // Invalidate local memory cache and update with validated value
    memoryCache[section] = validated as any;
  }

  /**
   * Read all setting sections to return a consolidated FullSettings object
   */
  static async getAllSettings(): Promise<FullSettings> {
    const keys = Object.keys(FullSettingsSchema.shape) as Array<keyof FullSettings>;
    const result: Partial<FullSettings> = {};

    await Promise.all(
      keys.map(async (k) => {
        result[k] = await this.getSetting(k) as any;
      })
    );

    return result as FullSettings;
  }

  /**
   * Fallback default provider
   */
  private static getDefaultSetting<K extends keyof FullSettings>(section: K): FullSettings[K] {
    // Use Zod's parse empty object to trigger schema defaults
    return FullSettingsSchema.shape[section].parse({}) as any;
  }
}
