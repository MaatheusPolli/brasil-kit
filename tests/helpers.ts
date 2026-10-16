import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createBrasilClient, type BrasilClientOptions } from '../src/index.js';

export const fixture = <T = unknown>(name: string): T =>
  JSON.parse(readFileSync(join(process.cwd(), 'tests', 'fixtures', `${name}.json`), 'utf8')) as T;

type Reply = { status?: number; body?: unknown; headers?: Record<string, string> } | Error;
type Route = [match: string | RegExp, reply: Reply | ((url: string) => Reply)];

/** Fetch falso: casa a URL com as rotas em ordem. Nenhuma chamada real de rede. */
export function mockFetch(routes: Route[]) {
  const calls: string[] = [];
  const fn = async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input);
    calls.push(url);
    const route = routes.find(([m]) => (typeof m === 'string' ? url.includes(m) : m.test(url)));
    if (!route) throw new Error(`Rota não mockada: ${url}`);
    const reply = typeof route[1] === 'function' ? route[1](url) : route[1];
    if (reply instanceof Error) throw reply;
    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
      status: reply.status ?? 200,
      headers: { 'content-type': 'application/json', ...reply.headers },
    });
  };
  return Object.assign(fn as typeof globalThis.fetch, { calls });
}

export const ok = (body: unknown) => ({ status: 200, body });

export function client(routes: Route[], options: BrasilClientOptions = {}) {
  const fetch = mockFetch(routes);
  const brasil = createBrasilClient({ retries: 0, retryOptions: { sleep: async () => {} }, ...options, fetch });
  return { brasil, fetch };
}
