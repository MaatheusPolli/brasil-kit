import { cached, dedupe, type CoreContext } from '../core/context.js';
import type { RequestOptions } from '../core/http.js';
import { fallback } from '../core/fallback.js';
import { normalizeCep, normalizeUf, requireText } from '../core/validate.js';
import type { BuscaEnderecoParams, Endereco, FonteCep } from '../domain/endereco.js';
import { createViaCep } from '../providers/viacep/client.js';
import { createBrasilApi } from '../providers/brasilapi/client.js';

export interface CepResourceOptions {
  /** Ordem dos providers no fallback. Default `['viacep', 'brasilapi']`. */
  providers?: readonly FonteCep[];
}

export interface CepResource {
  /** Busca um CEP com fallback ViaCEP ↔ BrasilAPI. Aceita `01001000` ou `01001-000`. */
  get(cep: string, options?: RequestOptions): Promise<Endereco>;
  /** Busca CEPs por endereço (ViaCEP). `cidade` e `logradouro` exigem ao menos 3 caracteres. */
  search(params: BuscaEnderecoParams, options?: RequestOptions): Promise<Endereco[]>;
}

export function createCep(ctx: CoreContext, options: CepResourceOptions = {}): CepResource {
  const viacep = createViaCep(ctx.http);
  const brasilapi = createBrasilApi(ctx.http);
  const order = options.providers ?? (['viacep', 'brasilapi'] as const);
  const lookup: Record<FonteCep, (cep: string, options?: RequestOptions) => Promise<Endereco>> = {
    viacep: (cep, options) => viacep.getCep(cep, options),
    brasilapi: (cep, options) => brasilapi.getCep(cep, options),
  };

  return {
    get(input, options) {
      const cep = normalizeCep(input);
      return cached(ctx, `cep:${cep}`, () => fallback(order.map((name) => () => lookup[name](cep, options))), dedupe(options));
    },
    search(params, options) {
      const uf = normalizeUf(params?.uf);
      const cidade = requireText(params.cidade, 'cidade', 3);
      const logradouro = requireText(params.logradouro, 'logradouro', 3);
      const key = `cep:search:${uf}:${cidade.toLowerCase()}:${logradouro.toLowerCase()}`;
      return cached(ctx, key, () => viacep.search(uf, cidade, logradouro, options), dedupe(options));
    },
  };
}

export type { Endereco, BuscaEnderecoParams, FonteCep } from '../domain/endereco.js';
