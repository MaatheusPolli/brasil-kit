import { describe, expect, it, vi } from 'vitest';
import { createMemoryCache, createLocalStorageCache } from '../../src/core/cache/index.js';
import { cached, type CoreContext } from '../../src/core/context.js';

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

describe('memory cache', () => {
  it('expira pelo TTL', () => {
    let t = 0;
    const cache = createMemoryCache({ now: () => t });
    cache.set('a', 1, 100);
    expect(cache.get('a')).toBe(1);
    t = 100;
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('respeita maxEntries descartando a mais antiga', () => {
    const cache = createMemoryCache({ maxEntries: 2 });
    cache.set('a', 1, 1000);
    cache.set('b', 2, 1000);
    cache.set('c', 3, 1000);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
    cache.delete!('c');
    expect(cache.get('c')).toBeUndefined();
    cache.clear!();
    expect(cache.size).toBe(0);
  });
});

describe('localStorage cache', () => {
  it('grava com prefixo, expira e limpa só as próprias chaves', () => {
    let t = 0;
    const storage = fakeStorage();
    storage.setItem('outra', 'x');
    const cache = createLocalStorageCache({ storage, now: () => t, prefix: 'bk:' });
    cache.set('a', { x: 1 }, 50);
    expect(storage.map.has('bk:a')).toBe(true);
    expect(cache.get('a')).toEqual({ x: 1 });
    t = 50;
    expect(cache.get('a')).toBeUndefined();
    expect(storage.map.has('bk:a')).toBe(false);
    cache.set('b', 1, 50);
    cache.set('c', 1, 50);
    cache.delete!('b');
    expect(storage.map.has('bk:b')).toBe(false);
    cache.clear!();
    expect([...storage.map.keys()]).toEqual(['outra']);
  });

  it('descarta entrada corrompida e ignora erro de cota', () => {
    const storage = fakeStorage();
    const cache = createLocalStorageCache({ storage });
    storage.setItem('brasil-sdk:x', '{quebrado');
    expect(cache.get('x')).toBeUndefined();
    expect(cache.get('nada')).toBeUndefined();
    storage.setItem = () => {
      throw new Error('QuotaExceeded');
    };
    expect(() => cache.set('y', 1, 10)).not.toThrow();
  });

  it('usa globalThis.localStorage ou falha claramente', () => {
    try {
      vi.stubGlobal('localStorage', undefined);
      expect(() => createLocalStorageCache()).toThrow(/localStorage/);
      vi.stubGlobal('localStorage', fakeStorage());
      expect(() => createLocalStorageCache()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('cached()', () => {
  it('evita a segunda chamada e funciona sem cache', async () => {
    let calls = 0;
    const fn = async () => ++calls;
    const ctx = { cache: createMemoryCache(), cacheTtl: 1000 } as unknown as CoreContext;
    expect(await cached(ctx, 'k', fn)).toBe(1);
    expect(await cached(ctx, 'k', fn)).toBe(1);
    const semCache = { cache: null, cacheTtl: 1000 } as unknown as CoreContext;
    expect(await cached(semCache, 'k', fn)).toBe(2);
    expect(await cached(semCache, 'k', fn)).toBe(3);
  });
});
