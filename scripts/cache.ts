interface CacheItem<T> {
  value: T;
  expiresAt: number;
}

export class InMemoryCache {
  private store = new Map<string, CacheItem<unknown>>();

  get<T>(key: string): T | undefined {
    const item = this.store.get(key) as CacheItem<T> | undefined;
    if (!item) return undefined;
    if (item.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return item.value;
  }

  set<T>(key: string, value: T, ttlSeconds = 3600): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export function createCache(): InMemoryCache {
  return new InMemoryCache();
}

export type QaIntelCache = InMemoryCache;