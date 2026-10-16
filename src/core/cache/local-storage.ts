import type { CacheAdapter } from './types.js';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

export interface LocalStorageCacheOptions {
  prefix?: string;
  storage?: StorageLike;
  now?: () => number;
}

export function createLocalStorageCache(options: LocalStorageCacheOptions = {}): CacheAdapter {
  const { prefix = 'brasil-kit:', now = Date.now } = options;
  const storage = options.storage ?? (globalThis as { localStorage?: StorageLike }).localStorage;
  if (!storage) throw new Error('localStorage indisponível neste ambiente');

  return {
    get<T>(key: string) {
      const raw = storage.getItem(prefix + key);
      if (raw === null) return undefined;
      try {
        const entry = JSON.parse(raw) as { v: T; e: number };
        if (entry.e > now()) return entry.v;
      } catch {
        /* entrada corrompida: descarta */
      }
      storage.removeItem(prefix + key);
      return undefined;
    },
    set(key, value, ttlMs) {
      try {
        storage.setItem(prefix + key, JSON.stringify({ v: value, e: now() + ttlMs }));
      } catch {
        /* cota excedida: cache é best-effort */
      }
    },
    delete(key) {
      storage.removeItem(prefix + key);
    },
    clear() {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k?.startsWith(prefix)) keys.push(k);
      }
      keys.forEach((k) => storage.removeItem(k));
    },
  };
}
