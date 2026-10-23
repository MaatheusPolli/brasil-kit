import { ValidationError } from './core/errors.js';
import { createMemoryCache } from './core/cache/memory.js';
import type { CacheAdapter } from './core/cache/types.js';
import { createHttp, type Interceptors } from './core/http.js';
import type { CoreContext } from './core/context.js';
import type { RetryOptions } from './core/retry.js';

export interface BrasilClientConfig {
  /** Timeout por tentativa em ms. Default 5000. */
  readonly timeout?: number;
  /** Tentativas extras em erro transitório. Default 2. */
  readonly retries?: number;
  /** Default `'memory'`. */
  readonly cache?: CacheAdapter | 'memory' | 'none';
  /** TTL padrão do cache em ms. Default 1h. */
  readonly cacheTtl?: number;
  /** Injetável para testes ou runtimes sem fetch global. */
  readonly fetch?: typeof globalThis.fetch;
  readonly interceptors?: Interceptors | readonly Interceptors[];
  /** Ajuste fino do backoff (atrasos, sleep). */
  readonly retryOptions?: Omit<RetryOptions, 'retries'>;
}

export interface ResolvedConfig {
  readonly timeout: number;
  readonly retries: number;
  readonly cache: CacheAdapter | null;
  readonly cacheTtl: number;
  readonly fetch: typeof globalThis.fetch;
  readonly interceptors: readonly Interceptors[];
  readonly retryOptions?: Omit<RetryOptions, 'retries'>;
}

const isMany = (value: Interceptors | readonly Interceptors[]): value is readonly Interceptors[] => Array.isArray(value);

export const DEFAULTS = Object.freeze({ timeout: 5000, retries: 2, cacheTtl: 60 * 60 * 1000 });

export function resolveConfig(config: BrasilClientConfig = {}): ResolvedConfig {
  const timeout = config.timeout ?? DEFAULTS.timeout;
  if (!Number.isFinite(timeout) || timeout <= 0) throw new ValidationError('timeout deve ser um número positivo');

  const retries = config.retries ?? DEFAULTS.retries;
  if (!Number.isInteger(retries) || retries < 0 || retries > 10) throw new ValidationError('retries deve ser inteiro entre 0 e 10');

  const cacheTtl = config.cacheTtl ?? DEFAULTS.cacheTtl;
  if (!Number.isFinite(cacheTtl) || cacheTtl <= 0) throw new ValidationError('cacheTtl deve ser um número positivo');

  const option = config.cache ?? 'memory';
  let cache: CacheAdapter | null;
  if (option === 'memory') cache = createMemoryCache();
  else if (option === 'none') cache = null;
  else if (typeof option === 'object' && option && typeof option.get === 'function' && typeof option.set === 'function') cache = option;
  else throw new ValidationError("cache deve ser 'memory', 'none' ou um CacheAdapter");

  const fetchFn = config.fetch ?? globalThis.fetch;
  if (typeof fetchFn !== 'function') throw new ValidationError('fetch indisponível: passe `fetch` na configuração');

  const raw = config.interceptors;
  const interceptors = Object.freeze(raw === undefined ? [] : isMany(raw) ? [...raw] : [raw]);

  return Object.freeze({
    timeout,
    retries,
    cache,
    cacheTtl,
    fetch: config.fetch ? fetchFn : (...args: Parameters<typeof fetch>) => globalThis.fetch(...args),
    interceptors,
    retryOptions: config.retryOptions,
  });
}

/** Cria o contexto compartilhado. Útil para montar só os resources que você usa (tree-shaking). */
export function createCore(config: BrasilClientConfig = {}): CoreContext {
  const resolved = resolveConfig(config);
  return Object.freeze({
    http: createHttp({
      fetch: resolved.fetch,
      timeout: resolved.timeout,
      retries: resolved.retries,
      interceptors: resolved.interceptors,
      retry: resolved.retryOptions,
    }),
    cache: resolved.cache,
    cacheTtl: resolved.cacheTtl,
  });
}
