import { cached, dedupe, type CoreContext } from '../core/context.js';
import type { RequestOptions } from '../core/http.js';
import { requireInt } from '../core/validate.js';
import type { Banco } from '../domain/outros.js';
import { createBrasilApi } from '../providers/brasilapi/client.js';

export interface BancosResource {
  list(options?: RequestOptions): Promise<Banco[]>;
  /** Código COMPE (ex.: `1` ou `"001"` para o Banco do Brasil). */
  getByCode(code: number | string, options?: RequestOptions): Promise<Banco>;
}

export function createBancos(ctx: CoreContext): BancosResource {
  const api = createBrasilApi(ctx.http);
  return {
    list: (options) => cached(ctx, 'bancos:list', () => api.listBancos(options), dedupe(options)),
    getByCode(input, options) {
      const code = requireInt(input, 'código do banco', 1, 999);
      return cached(ctx, `bancos:${code}`, () => api.getBanco(code, options), dedupe(options));
    },
  };
}

export type { Banco } from '../domain/outros.js';
