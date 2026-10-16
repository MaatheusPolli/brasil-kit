import { describe, expect, it, vi } from 'vitest';
import { resolveConfig, createBrasilClient, ValidationError, createMemoryCache, DEFAULTS } from '../../src/index.js';

describe('config', () => {
  it('aplica defaults e congela', () => {
    const c = resolveConfig({ fetch: vi.fn() });
    expect(c).toMatchObject({ timeout: DEFAULTS.timeout, retries: 2, cacheTtl: DEFAULTS.cacheTtl });
    expect(c.cache).not.toBeNull();
    expect(Object.isFrozen(c)).toBe(true);
  });

  it.each([
    [{ timeout: 0 }],
    [{ timeout: Number.NaN }],
    [{ retries: -1 }],
    [{ retries: 1.5 }],
    [{ retries: 11 }],
    [{ cacheTtl: 0 }],
    [{ cache: 'redis' as never }],
    [{ cache: {} as never }],
  ])('rejeita %j', (cfg) => {
    expect(() => resolveConfig({ fetch: vi.fn(), ...cfg })).toThrow(ValidationError);
  });

  it('aceita cache none, adapter e interceptor único', () => {
    expect(resolveConfig({ cache: 'none' }).cache).toBeNull();
    const adapter = createMemoryCache();
    expect(resolveConfig({ cache: adapter }).cache).toBe(adapter);
    const i = { onRequest: () => {} };
    expect(resolveConfig({ interceptors: i }).interceptors).toEqual([i]);
    expect(resolveConfig({ interceptors: [i, i] }).interceptors).toHaveLength(2);
  });

  it('usa o fetch global de forma tardia quando nenhum é passado', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"state":"SP","cities":[]}'));
    try {
      const brasil = createBrasilClient({ retries: 0 });
      await expect(brasil.ddd.get(11)).resolves.toMatchObject({ uf: 'SP' });
      expect(spy).toHaveBeenCalledOnce();
    } finally {
      spy.mockRestore();
    }
  });

  it('falha claramente sem fetch disponível', () => {
    const original = globalThis.fetch;
    try {
      (globalThis as { fetch?: unknown }).fetch = undefined;
      expect(() => resolveConfig()).toThrow(/fetch/);
    } finally {
      globalThis.fetch = original;
    }
  });
});
