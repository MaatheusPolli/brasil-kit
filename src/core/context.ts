import type { CacheAdapter } from './cache/types.js';
import type { HttpClient } from './http.js';

/** Dependências compartilhadas por todos os resources. Sem estado global. */
export interface CoreContext {
  readonly http: HttpClient;
  readonly cache: CacheAdapter | null;
  readonly cacheTtl: number;
}

/** Executa `fn` passando pelo cache do contexto (se houver). */
export async function cached<T>(ctx: CoreContext, key: string, fn: () => Promise<T>, ttl = ctx.cacheTtl): Promise<T> {
  if (!ctx.cache) return fn();
  const hit = await ctx.cache.get<T>(key);
  if (hit !== undefined) return hit;
  const value = await fn();
  await ctx.cache.set(key, value, ttl);
  return value;
}
