import { cached, dedupe, type CoreContext } from '../core/context.js';
import type { RequestOptions } from '../core/http.js';
import { requireInt } from '../core/validate.js';
import type { Ddd } from '../domain/outros.js';
import { createBrasilApi } from '../providers/brasilapi/client.js';

export interface DddResource {
  /** UF e cidades atendidas por um DDD (11–99). */
  get(ddd: number | string, options?: RequestOptions): Promise<Ddd>;
}

export function createDdd(ctx: CoreContext): DddResource {
  const api = createBrasilApi(ctx.http);
  return {
    get(input, options) {
      const ddd = String(requireInt(input, 'DDD', 11, 99));
      return cached(ctx, `ddd:${ddd}`, () => api.getDdd(ddd, options), dedupe(options));
    },
  };
}

export type { Ddd } from '../domain/outros.js';
