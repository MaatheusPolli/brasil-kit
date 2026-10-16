export type ErrorCode = 'NOT_FOUND' | 'RATE_LIMIT' | 'TIMEOUT' | 'PROVIDER' | 'VALIDATION';

export interface ErrorDetails {
  provider?: string;
  status?: number;
  url?: string;
  cause?: unknown;
}

/** Base de todos os erros do SDK. `instanceof` funciona em qualquer subclasse. */
export class BrasilKitError extends Error {
  readonly code: ErrorCode;
  readonly provider?: string;
  readonly status?: number;
  readonly url?: string;

  constructor(code: ErrorCode, message: string, details: ErrorDetails = {}) {
    super(message, details.cause === undefined ? undefined : { cause: details.cause });
    this.name = new.target.name;
    this.code = code;
    this.provider = details.provider;
    this.status = details.status;
    this.url = details.url;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends BrasilKitError {
  constructor(message = 'Recurso não encontrado', details?: ErrorDetails) {
    super('NOT_FOUND', message, details);
  }
}

export class RateLimitError extends BrasilKitError {
  /** Segundos sugeridos pelo header Retry-After, quando presente. */
  readonly retryAfter?: number;
  constructor(message = 'Limite de requisições atingido', details?: ErrorDetails & { retryAfter?: number }) {
    super('RATE_LIMIT', message, details);
    this.retryAfter = details?.retryAfter;
  }
}

export class TimeoutError extends BrasilKitError {
  constructor(message = 'Tempo limite excedido', details?: ErrorDetails) {
    super('TIMEOUT', message, details);
  }
}

/** Falha do provider: rede, 5xx, 4xx inesperado ou resposta inválida. */
export class ProviderError extends BrasilKitError {
  constructor(message = 'Falha no provider', details?: ErrorDetails) {
    super('PROVIDER', message, details);
  }
}

export class ValidationError extends BrasilKitError {
  constructor(message: string) {
    super('VALIDATION', message);
  }
}

/**
 * Vale tentar OUTRO provider: erros transitórios e 403 (acesso negado é do
 * provider — ex.: bloqueio de IPs de datacenter —, não da requisição).
 */
export function shouldFallback(error: unknown): boolean {
  return isTransient(error) || (error instanceof ProviderError && error.status === 403);
}

/**
 * Erros transitórios: vale a pena tentar de novo (retry) ou tentar outro provider (fallback).
 * 4xx (exceto 429) nunca é transitório — a resposta seria a mesma.
 */
export function isTransient(error: unknown): boolean {
  if (error instanceof TimeoutError || error instanceof RateLimitError) return true;
  if (error instanceof ProviderError) return error.status === undefined || error.status >= 500;
  return false;
}
