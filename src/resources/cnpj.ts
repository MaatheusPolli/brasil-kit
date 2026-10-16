import { cached, type CoreContext } from '../core/context.js';
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
  get(cnpj: string): Promise<Empresa>;
}

export function createCnpj(ctx: CoreContext, options: CnpjResourceOptions = {}): CnpjResource {
  const lookup = { brasilapi: createBrasilApi(ctx.http).getCnpj, minhareceita: createMinhaReceita(ctx.http).getCnpj };
  const order = options.providers ?? (['brasilapi', 'minhareceita'] as const);
  return {
    get(input) {
      const cnpj = normalizeCnpj(input);
      return cached(ctx, `cnpj:${cnpj}`, () => fallback(order.map((name) => () => lookup[name](cnpj))));
    },
  };
}

export type { Empresa, Socio, Cnae, FonteCnpj } from '../domain/empresa.js';
