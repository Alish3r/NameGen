/**
 * In-memory TTL cache for Pexels results.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const cache = new Map<string, CacheEntry<unknown>>();

export function getCacheKey(theme: string, wBucket: number, hBucket: number): string {
  return `${theme}:${wBucket}:${hBucket}`;
}

export function get<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function set<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}
