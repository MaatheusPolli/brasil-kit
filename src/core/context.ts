import type { CacheAdapter } from './cache/types.js';
import type { HttpClient } from './http.js';

/** Dependências compartilhadas por todos os resources. Sem estado global. */
export interface CoreContext {
  readonly http: HttpClient;
  readonly cache: CacheAdapter | null;
  readonly cacheTtl: number;
}

/** Requisições em voo por contexto: duas chamadas simultâneas da mesma chave viram uma só. */
const inFlight = new WeakMap<CoreContext, Map<string, Promise<unknown>>>();

export interface CachedOptions {
  /** TTL desta entrada em ms. Default: `ctx.cacheTtl`. */
  readonly ttl?: number;
  /**
   * Reaproveitar a requisição em voo da mesma chave. Default `true`; desligue
   * quando a chamada tem `AbortSignal` próprio, para que um cancelamento não
   * derrube quem está esperando a mesma chave.
   */
  readonly dedupe?: boolean;
}

/** Opções de cache para uma chamada: compartilha a requisição em voo só quando não há `signal`. */
export const dedupe = (options?: { readonly signal?: AbortSignal }): CachedOptions => ({ dedupe: !options?.signal });

/** Executa `fn` passando pelo cache do contexto (se houver), sem disparar chamadas duplicadas. */
export async function cached<T>(ctx: CoreContext, key: string, fn: () => Promise<T>, options: CachedOptions = {}): Promise<T> {
  const { ttl = ctx.cacheTtl, dedupe = true } = options;
  if (!ctx.cache) return fn();
  const hit = await ctx.cache.get<T>(key);
  if (hit !== undefined) return hit;
  if (!dedupe) {
    const value = await fn();
    await ctx.cache.set(key, value, ttl);
    return value;
  }

  let pending = inFlight.get(ctx);
  if (!pending) inFlight.set(ctx, (pending = new Map()));
  const running = pending.get(key) as Promise<T> | undefined;
  if (running) return running;

  const promise = (async () => {
    const value = await fn();
    await ctx.cache?.set(key, value, ttl);
    return value;
  })().finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}
