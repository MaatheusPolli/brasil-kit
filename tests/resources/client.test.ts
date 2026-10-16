import { describe, expect, it } from 'vitest';
import { createBrasilClient, createCore, createCep, createMemoryCache, type CacheAdapter } from '../../src/index.js';
import { client, fixture, mockFetch, ok } from '../helpers.js';

describe('createBrasilClient', () => {
  it('clientes são independentes (sem estado global)', async () => {
    const a = client([['viacep', ok(fixture('viacep-01001000'))]]);
    const b = client([['viacep', ok(fixture('viacep-01001000'))]]);
    await a.brasil.cep.get('01001000');
    await b.brasil.cep.get('01001000');
    expect(a.fetch.calls).toHaveLength(1);
    expect(b.fetch.calls).toHaveLength(1);
    expect(Object.isFrozen(a.brasil)).toBe(true);
  });

  it('cache "none" sempre chama a rede e clearCache não falha', async () => {
    const { brasil, fetch } = client([['viacep', ok(fixture('viacep-01001000'))]], { cache: 'none' });
    await brasil.cep.get('01001000');
    await brasil.cep.get('01001000');
    expect(fetch.calls).toHaveLength(2);
    await expect(brasil.clearCache()).resolves.toBeUndefined();
  });

  it('cache customizado assíncrono', async () => {
    const store = new Map<string, unknown>();
    const cache: CacheAdapter = {
      get: async (k) => store.get(k) as never,
      set: async (k, v) => void store.set(k, v),
    };
    const { brasil } = client([['viacep', ok(fixture('viacep-01001000'))]], { cache });
    await brasil.cep.get('01001000');
    expect(store.has('cep:01001000')).toBe(true);
    await expect(brasil.clearCache()).resolves.toBeUndefined();
  });

  it('retry na camada http antes do fallback', async () => {
    let n = 0;
    const { brasil, fetch } = client([['viacep', () => (n++ < 1 ? { status: 503 } : ok(fixture('viacep-01001000')))]], { retries: 2 });
    await expect(brasil.cep.get('01001000')).resolves.toMatchObject({ fonte: 'viacep' });
    expect(fetch.calls).toHaveLength(2);
  });

  it('resources avulsos (tree-shaking) sobre createCore', async () => {
    const fetch = mockFetch([['viacep', ok(fixture('viacep-01001000'))]]);
    const cep = createCep(createCore({ fetch, cache: createMemoryCache() }));
    await expect(cep.get('01001000')).resolves.toMatchObject({ cidade: 'São Paulo' });
    expect(createBrasilClient({ fetch })).toHaveProperty('ibge');
  });
});
