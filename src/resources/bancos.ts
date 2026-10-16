import { cached, type CoreContext } from '../core/context.js';
import { requireInt } from '../core/validate.js';
import type { Banco } from '../domain/outros.js';
import { createBrasilApi } from '../providers/brasilapi/client.js';

export interface BancosResource {
  list(): Promise<Banco[]>;
  /** Código COMPE (ex.: `1` ou `"001"` para o Banco do Brasil). */
  getByCode(code: number | string): Promise<Banco>;
}

export function createBancos(ctx: CoreContext): BancosResource {
  const api = createBrasilApi(ctx.http);
  return {
    list: () => cached(ctx, 'bancos:list', () => api.listBancos()),
    getByCode(input) {
      const code = requireInt(input, 'código do banco', 1, 999);
      return cached(ctx, `bancos:${code}`, () => api.getBanco(code));
    },
  };
}

export type { Banco } from '../domain/outros.js';
