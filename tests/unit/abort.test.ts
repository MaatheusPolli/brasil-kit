import { describe, expect, it, vi } from 'vitest';
import { createHttp } from '../../src/core/http.js';
import { CanceledError, createBrasilClient, TimeoutError } from '../../src/index.js';
import { fixture, ok, mockFetch } from '../helpers.js';

/** Fetch que só resolve quando `release()` é chamado — e rejeita ao abortar, como o fetch real. */
function pendingFetch(body: unknown) {
  let release = () => {};
  const calls: string[] = [];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push(String(input));
    return new Promise<Response>((resolve, reject) => {
      release = () => resolve(new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } }));
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
  }) as typeof globalThis.fetch;
  return { fetch: Object.assign(fn, { calls }), release: () => release() };
}

const base = { timeout: 1000, retries: 0 };

describe('AbortSignal por chamada', () => {
  it('signal já abortado falha antes de chamar a rede', async () => {
    const fetch = vi.fn(mockFetch([['a', ok({ x: 1 })]]));
    const http = createHttp({ ...base, fetch });
    const err = await http.getJson('https://a', 'p', { signal: AbortSignal.abort() }).catch((e) => e);
    expect(err).toBeInstanceOf(CanceledError);
    expect(err).toMatchObject({ code: 'CANCELED' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('abortar durante a requisição vira CanceledError, não TimeoutError', async () => {
    const { fetch } = pendingFetch({});
    const controller = new AbortController();
    const http = createHttp({ ...base, fetch });
    const promise = http.getJson('https://a', 'p', { signal: controller.signal });
    controller.abort();
    const err = await promise.catch((e) => e);
    expect(err).toBeInstanceOf(CanceledError);
    expect(err).not.toBeInstanceOf(TimeoutError);
  });

  it('cancelamento não gera retry nem fallback', async () => {
    const { fetch } = pendingFetch({});
    const controller = new AbortController();
    const brasil = createBrasilClient({ fetch, retries: 3, retryOptions: { sleep: async () => {} } });
    const promise = brasil.cnpj.get('00000000000191', { signal: controller.signal });
    while (fetch.calls.length === 0) await new Promise((r) => setTimeout(r, 1));
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(CanceledError);
    // Uma só tentativa: nem as 3 retentativas nem o fallback para a Minha Receita.
    expect(fetch.calls).toHaveLength(1);
  });

  it('cancelar uma chamada não derruba outra da mesma chave', async () => {
    const { fetch, release } = pendingFetch(fixture('viacep-01001000'));
    const controller = new AbortController();
    const brasil = createBrasilClient({ fetch, retries: 0 });
    const cancelada = brasil.cep.get('01001000', { signal: controller.signal });
    const mantida = brasil.cep.get('01001000');
    controller.abort();
    await expect(cancelada).rejects.toBeInstanceOf(CanceledError);
    release();
    await expect(mantida).resolves.toMatchObject({ cep: '01001000' });
  });

  it('chamada com signal não abortado funciona e popula o cache', async () => {
    const brasil = createBrasilClient({ fetch: mockFetch([['viacep', ok(fixture('viacep-01001000'))]]), retries: 0 });
    const controller = new AbortController();
    await expect(brasil.cep.get('01001000', { signal: controller.signal })).resolves.toMatchObject({ cep: '01001000' });
    await expect(brasil.cep.get('01001000')).resolves.toMatchObject({ cep: '01001000' });
  });

  it('interceptores recebem o erro de cancelamento', async () => {
    const { fetch } = pendingFetch({});
    const onError = vi.fn();
    const controller = new AbortController();
    const http = createHttp({ ...base, fetch, interceptors: [{ onError }] });
    const promise = http.getJson('https://a', 'p', { signal: controller.signal });
    controller.abort();
    await promise.catch(() => {});
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(CanceledError) }));
  });
});
