import { cached, dedupe, type CoreContext } from '../core/context.js';
import type { RequestOptions } from '../core/http.js';
import { fallback } from '../core/fallback.js';
import { normalizeCnpj } from '../core/validate.js';
import type { Empresa, FonteCnpj } from '../domain/empresa.js';
import { createBrasilApi } from '../providers/brasilapi/client.js';
import { createMinhaReceita } from '../providers/minhareceita/client.js';

export interface CnpjResourceOptions {
  /** Ordem dos providers no fallback. Default `['brasilapi', 'minhareceita']`. */
  providers?: readonly FonteCnpj[];
}

export interface CnpjResource {
  /** Dados cadastrais, sócios e CNAEs, com fallback BrasilAPI ↔ Minha Receita. Valida os dígitos verificadores antes da rede. */
  get(cnpj: string, options?: RequestOptions): Promise<Empresa>;
}

export function createCnpj(ctx: CoreContext, options: CnpjResourceOptions = {}): CnpjResource {
  const brasilapi = createBrasilApi(ctx.http);
  const minhareceita = createMinhaReceita(ctx.http);
  const lookup: Record<FonteCnpj, (cnpj: string, options?: RequestOptions) => Promise<Empresa>> = {
    brasilapi: (cnpj, options) => brasilapi.getCnpj(cnpj, options),
    minhareceita: (cnpj, options) => minhareceita.getCnpj(cnpj, options),
  };
  const order = options.providers ?? (['brasilapi', 'minhareceita'] as const);
  return {
    get(input, options) {
      const cnpj = normalizeCnpj(input);
      return cached(ctx, `cnpj:${cnpj}`, () => fallback(order.map((name) => () => lookup[name](cnpj, options))), dedupe(options));
    },
  };
}

export type { Empresa, Socio, Cnae, FonteCnpj } from '../domain/empresa.js';
