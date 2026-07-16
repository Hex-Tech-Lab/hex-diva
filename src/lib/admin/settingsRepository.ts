/**
 * Settings Repository Rebuild
 * Interacts with platform_settings table with Upstash Redis caching (cross-instance)
 * and compare-and-swap (CAS) writes for concurrent-writer safety.
 */

import { getSupabaseAdmin } from '@/lib/db';
import { getCached, setCached, deleteCached } from '@/lib/cache';
import { FullSettingsSchema, type FullSettings } from './settingsContracts';

const SETTINGS_CACHE_TTL = 300; // seconds

function settingsCacheKey(section: string): string {
  return `settings:${section}`;
}

/**
 * Thrown when a concurrent writer modified the same settings row between
 * our version read and our conditional write. Callers may retry once.
 */
export class SettingsConflictError extends Error {
  constructor(section: string) {
    super(
      `Concurrent modification detected for settings section "${section}". Reload and retry.`
    );
    this.name = 'SettingsConflictError';
  }
}

export class SettingsRepository {
  /**
   * Fetch a single settings section.
   * Priority: Redis cache -> Database -> Zod defaults
   */
  static async getSetting<K extends keyof FullSettings>(section: K): Promise<FullSettings[K]> {
    // 1. Redis cache hit (cross-instance)
    const cacheKey = settingsCacheKey(section);
    const cached = await getCached<unknown>(cacheKey);
    if (cached !== null) {
      const parsed = FullSettingsSchema.shape[section].safeParse(cached);
      if (parsed.success) {
        return parsed.data as FullSettings[K];
      }
      // Stale/corrupt cache entry: drop it and fall through to the database
      await deleteCached(cacheKey);
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

      // 3. Populate Redis cache (TTL bounds staleness across instances)
      await setCached(cacheKey, validated, SETTINGS_CACHE_TTL);

      return validated as any;
    } catch (err) {
      console.error(`[SettingsRepository] Failed reading key ${section}, falling back to defaults:`, err);
      return this.getDefaultSetting(section);
    }
  }

  /**
   * Save a single settings section to DB with a compare-and-swap on `version`.
   * Throws SettingsConflictError when a concurrent writer wins the race.
   * No retry loops here — callers may retry once at their own discretion.
   */
  static async updateSetting<K extends keyof FullSettings>(
    section: K,
    value: FullSettings[K],
    updatedBy: string
  ): Promise<void> {
    // Validate first before saving
    const validated = FullSettingsSchema.shape[section].parse(value);

    const supabase = getSupabaseAdmin();

    // Read current version for the CAS predicate
    const { data: current, error: readError } = await supabase
      .from('platform_settings' as any)
      .select('version')
      .eq('key', section)
      .maybeSingle();

    if (readError) {
      throw new Error(`Failed reading settings key ${section}: ${readError.message}`);
    }

    if (current) {
      const currentVersion = (current as any).version ?? 1;

      // Conditional update: only wins if version is unchanged since our read
      const { data: updatedRows, error } = await supabase
        .from('platform_settings' as any)
        .update({
          value: validated as any,
          version: currentVersion + 1,
          updated_at: new Date().toISOString(),
          updated_by: updatedBy,
        } as any)
        .eq('key', section)
        .eq('version', currentVersion)
        .select();

      if (error) {
        throw new Error(`Failed saving settings key ${section}: ${error.message}`);
      }

      if (!updatedRows || updatedRows.length === 0) {
        // A concurrent writer bumped the version between our read and write
        throw new SettingsConflictError(section);
      }
    } else {
      // No row yet: insert version 1; a unique violation means we lost an insert race
      const { error } = await supabase
        .from('platform_settings' as any)
        .insert({
          key: section,
          section,
          value: validated as any,
          version: 1,
          updated_at: new Date().toISOString(),
          updated_by: updatedBy,
        } as any);

      if (error) {
        if ((error as any).code === '23505') {
          throw new SettingsConflictError(section);
        }
        throw new Error(`Failed saving settings key ${section}: ${error.message}`);
      }
    }

    // Invalidate the cross-instance cache on every successful write
    await deleteCached(settingsCacheKey(section));
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
