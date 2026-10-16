import { ProviderError, shouldFallback } from './errors.js';

/**
 * Tenta cada provider em ordem. Passa para o próximo em erro transitório
 * (rede, timeout, 5xx, 429) ou 403. 404/400 são definitivos e sobem direto.
 */
export async function fallback<T>(providers: ReadonlyArray<() => Promise<T>>): Promise<T> {
  if (providers.length === 0) throw new ProviderError('Nenhum provider configurado');
  let lastError: unknown;
  for (const provider of providers) {
    try {
      return await provider();
    } catch (error) {
      if (!shouldFallback(error)) throw error;
      lastError = error;
    }
  }
  throw lastError;
}
