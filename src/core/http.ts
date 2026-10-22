import { CanceledError, NotFoundError, ProviderError, RateLimitError, TimeoutError, BrasilKitError } from './errors.js';
import { withRetry, type RetryOptions } from './retry.js';

export interface RequestInfo {
  url: string;
  method: 'GET';
  provider: string;
  attempt: number;
}

export interface ResponseInfo extends RequestInfo {
  status: number;
  durationMs: number;
}

export interface ErrorInfo extends RequestInfo {
  error: BrasilKitError;
  durationMs: number;
}

export interface Interceptors {
  onRequest?: (info: RequestInfo) => void | Promise<void>;
  onResponse?: (info: ResponseInfo) => void | Promise<void>;
  onError?: (info: ErrorInfo) => void | Promise<void>;
}

export interface HttpOptions {
  fetch: typeof globalThis.fetch;
  timeout: number;
  retries: number;
  interceptors?: readonly Interceptors[];
  retry?: Omit<RetryOptions, 'retries'>;
  now?: () => number;
}

/** Opções por chamada. `signal` cancela a requisição (inclusive entre tentativas do retry). */
export interface RequestOptions {
  readonly signal?: AbortSignal;
}

export interface HttpClient {
  getJson<T>(url: string, provider: string, options?: RequestOptions): Promise<T>;
}

export function createHttp(options: HttpOptions): HttpClient {
  const { fetch: fetchFn, timeout, retries, interceptors = [], retry, now = Date.now } = options;

  async function emit<K extends keyof Interceptors>(hook: K, info: Parameters<NonNullable<Interceptors[K]>>[0]) {
    for (const i of interceptors) await (i[hook] as ((x: typeof info) => unknown) | undefined)?.(info);
  }

  async function attempt<T>(url: string, provider: string, n: number, external?: AbortSignal): Promise<T> {
    const base: RequestInfo = { url, method: 'GET', provider, attempt: n };
    if (external?.aborted) throw canceled(provider, url, external);
    await emit('onRequest', base);
    const start = now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const onExternalAbort = () => controller.abort();
    external?.addEventListener('abort', onExternalAbort, { once: true });
    try {
      let response: Response;
      try {
        response = await fetchFn(url, { method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal });
      } catch (cause) {
        if (external?.aborted) throw canceled(provider, url, external, cause);
        if (controller.signal.aborted) throw new TimeoutError(`Timeout de ${timeout}ms em ${provider}`, { provider, url, cause });
        throw new ProviderError(`Falha de rede em ${provider}`, { provider, url, cause });
      }
      await emit('onResponse', { ...base, status: response.status, durationMs: now() - start });
      if (!response.ok) throw statusError(response, provider, url);
      try {
        return (await response.json()) as T;
      } catch (cause) {
        if (external?.aborted) throw canceled(provider, url, external, cause);
        if (controller.signal.aborted) throw new TimeoutError(`Timeout de ${timeout}ms em ${provider}`, { provider, url, cause });
        throw new ProviderError(`Resposta inválida de ${provider}`, { provider, url, status: response.status, cause });
      }
    } catch (error) {
      const err = error instanceof BrasilKitError ? error : new ProviderError(String(error), { provider, url, cause: error });
      await emit('onError', { ...base, error: err, durationMs: now() - start });
      throw err;
    } finally {
      clearTimeout(timer);
      external?.removeEventListener('abort', onExternalAbort);
    }
  }

  return {
    getJson: (url, provider, options) =>
      withRetry((n) => attempt(url, provider, n, options?.signal), { ...retry, retries }),
  };
}

function canceled(provider: string, url: string, signal: AbortSignal, cause?: unknown): CanceledError {
  return new CanceledError(`Requisição cancelada em ${provider}`, { provider, url, cause: signal.reason ?? cause });
}

function statusError(response: Response, provider: string, url: string): BrasilKitError {
  const details = { provider, url, status: response.status };
  if (response.status === 404) return new NotFoundError(`Não encontrado em ${provider}`, details);
  if (response.status === 429) {
    const header = Number(response.headers.get('retry-after'));
    return new RateLimitError(`Rate limit em ${provider}`, { ...details, retryAfter: Number.isFinite(header) && header > 0 ? header : undefined });
  }
  return new ProviderError(`${provider} respondeu HTTP ${response.status}`, details);
}
