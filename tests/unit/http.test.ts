import { describe, expect, it, vi } from 'vitest';
import { createHttp, type Interceptors } from '../../src/core/http.js';
import { NotFoundError, ProviderError, RateLimitError, TimeoutError } from '../../src/core/errors.js';
import { mockFetch, ok } from '../helpers.js';

const base = { timeout: 1000, retries: 0 };

describe('http', () => {
  it('retorna JSON e envia Accept', async () => {
    const fetch = vi.fn(mockFetch([['a', ok({ x: 1 })]]));
    const http = createHttp({ ...base, fetch });
    await expect(http.getJson('https://a', 'p')).resolves.toEqual({ x: 1 });
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ method: 'GET', headers: { Accept: 'application/json' } });
  });

  it.each([
    [404, NotFoundError],
    [429, RateLimitError],
    [400, ProviderError],
    [503, ProviderError],
  ])('HTTP %i vira %s', async (status, Cls) => {
    const http = createHttp({ ...base, fetch: mockFetch([['a', { status, body: {} }]]) });
    const err = await http.getJson('https://a', 'p').catch((e) => e);
    expect(err).toBeInstanceOf(Cls);
    expect(err).toMatchObject({ status, provider: 'p', url: 'https://a' });
  });

  it('lê Retry-After no 429', async () => {
    const http = createHttp({ ...base, fetch: mockFetch([['a', { status: 429, headers: { 'retry-after': '7' } }]]) });
    await expect(http.getJson('https://a', 'p')).rejects.toMatchObject({ retryAfter: 7 });
  });

  it('falha de rede vira ProviderError sem status', async () => {
    const http = createHttp({ ...base, fetch: mockFetch([['a', new TypeError('fetch failed')]]) });
    await expect(http.getJson('https://a', 'p')).rejects.toMatchObject({ code: 'PROVIDER', status: undefined });
  });

  it('JSON inválido vira ProviderError', async () => {
    const fetch = (async () => new Response('<html>', { status: 200 })) as typeof globalThis.fetch;
    await expect(createHttp({ ...base, fetch }).getJson('https://a', 'p')).rejects.toBeInstanceOf(ProviderError);
  });

  it('timeout aborta de fato a requisição', async () => {
    let signal: AbortSignal | undefined;
    const fetch = ((_: unknown, init?: RequestInit) =>
      new Promise((_r, reject) => {
        signal = init?.signal ?? undefined;
        signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      })) as typeof globalThis.fetch;
    const http = createHttp({ fetch, timeout: 20, retries: 0 });
    await expect(http.getJson('https://a', 'p')).rejects.toBeInstanceOf(TimeoutError);
    expect(signal?.aborted).toBe(true);
  });

  it('timeout durante a leitura do corpo', async () => {
    const fetch = (async (_: unknown, init?: RequestInit) => {
      const body = new ReadableStream({
        start(controller) {
          init?.signal?.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')));
        },
      });
      return new Response(body, { status: 200 });
    }) as typeof globalThis.fetch;
    await expect(createHttp({ fetch, timeout: 20, retries: 0 }).getJson('https://a', 'p')).rejects.toBeInstanceOf(TimeoutError);
  });

  it('faz retry em 5xx e chama interceptors na ordem', async () => {
    const events: string[] = [];
    const log = (tag: string): Interceptors => ({
      onRequest: (i) => void events.push(`${tag}:req:${i.attempt}`),
      onResponse: (i) => void events.push(`${tag}:res:${i.status}`),
      onError: (i) => void events.push(`${tag}:err:${i.error.code}`),
    });
    let n = 0;
    const fetch = mockFetch([['a', () => (n++ === 0 ? { status: 500 } : ok(1))]]);
    const http = createHttp({ fetch, timeout: 1000, retries: 1, interceptors: [log('A'), log('B')], retry: { sleep: async () => {} } });
    await expect(http.getJson('https://a', 'p')).resolves.toBe(1);
    expect(events).toEqual([
      'A:req:0', 'B:req:0', 'A:res:500', 'B:res:500', 'A:err:PROVIDER', 'B:err:PROVIDER',
      'A:req:1', 'B:req:1', 'A:res:200', 'B:res:200',
    ]);
  });

  it('erro estranho de um interceptor é embrulhado em ProviderError', async () => {
    const http = createHttp({ ...base, fetch: mockFetch([['a', ok(1)]]), interceptors: [{ onResponse: () => { throw 'boom'; } }] });
    await expect(http.getJson('https://a', 'p')).rejects.toBeInstanceOf(ProviderError);
  });
});
