import { isTransient } from './errors.js';

export interface RetryOptions {
  /** Tentativas extras após a primeira. */
  retries: number;
  /** Atraso base em ms (dobra a cada tentativa). Default 200. */
  baseDelay?: number;
  /** Teto do atraso em ms. Default 5000. */
  maxDelay?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

export const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Backoff exponencial com "full jitter": atraso ∈ [0, min(max, base·2^n)]. */
export function backoffDelay(attempt: number, baseDelay = 200, maxDelay = 5000, random = Math.random): number {
  const ceiling = Math.min(maxDelay, baseDelay * 2 ** attempt);
  return Math.round(ceiling * random());
}

export async function withRetry<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  const { retries, baseDelay, maxDelay, shouldRetry = isTransient, sleep = defaultSleep, random = Math.random } = options;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      if (attempt >= retries || !shouldRetry(error, attempt)) throw error;
      await sleep(backoffDelay(attempt, baseDelay, maxDelay, random));
    }
  }
}
