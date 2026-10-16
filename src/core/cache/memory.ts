import type { CacheAdapter } from './types.js';

export interface MemoryCacheOptions {
  /** Máximo de entradas; a mais antiga sai primeiro. Default 500. */
  maxEntries?: number;
  now?: () => number;
}

export function createMemoryCache(options: MemoryCacheOptions = {}): CacheAdapter & { readonly size: number } {
  const { maxEntries = 500, now = Date.now } = options;
  const store = new Map<string, { value: unknown; expiresAt: number }>();
  return {
    get<T>(key: string) {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now()) {
        store.delete(key);
        return undefined;
      }
      return entry.value as T;
    },
    set(key, value, ttlMs) {
      store.delete(key);
      store.set(key, { value, expiresAt: now() + ttlMs });
      while (store.size > maxEntries) store.delete(store.keys().next().value as string);
    },
    delete(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    get size() {
      return store.size;
    },
  };
}
