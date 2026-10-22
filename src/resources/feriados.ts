import { cached, dedupe, type CoreContext } from '../core/context.js';
import type { RequestOptions } from '../core/http.js';
import { requireInt } from '../core/validate.js';
import type { Feriado } from '../domain/outros.js';
import { createBrasilApi } from '../providers/brasilapi/client.js';

export interface FeriadosResource {
  /** Feriados nacionais do ano (1900–2199). */
  get(ano: number, options?: RequestOptions): Promise<Feriado[]>;
}

export function createFeriados(ctx: CoreContext): FeriadosResource {
  const api = createBrasilApi(ctx.http);
  return {
    get(input, options) {
      const ano = requireInt(input, 'ano', 1900, 2199);
      return cached(ctx, `feriados:${ano}`, () => api.getFeriados(ano, options), dedupe(options));
    },
  };
}

export type { Feriado } from '../domain/outros.js';
