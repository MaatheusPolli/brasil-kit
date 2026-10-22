import { cached, dedupe, type CoreContext } from '../core/context.js';
import type { RequestOptions } from '../core/http.js';
import { ValidationError } from '../core/errors.js';
import { normalizeUf } from '../core/validate.js';
import type { Estado, Municipio } from '../domain/municipio.js';
import type { UF } from '../domain/uf.js';
import { createIbge as createIbgeProvider } from '../providers/ibge/client.js';

const DAY = 24 * 60 * 60 * 1000;

export interface IbgeResource {
  estados(options?: RequestOptions): Promise<Estado[]>;
  municipiosPorUf(uf: UF | string, options?: RequestOptions): Promise<Municipio[]>;
  /** Código IBGE de 7 dígitos (ex.: `3550308` para São Paulo). */
  municipioPorCodigo(codigo: string | number, options?: RequestOptions): Promise<Municipio>;
}

export function createIbge(ctx: CoreContext): IbgeResource {
  const api = createIbgeProvider(ctx.http);
  return {
    estados: (options) => cached(ctx, 'ibge:estados', () => api.estados(options), { ...dedupe(options), ttl: DAY }),
    municipiosPorUf(input, options) {
      const uf = normalizeUf(input);
      return cached(ctx, `ibge:municipios:${uf}`, () => api.municipiosPorUf(uf, options), { ...dedupe(options), ttl: DAY });
    },
    municipioPorCodigo(input, options) {
      const codigo = String(input).trim();
      if (!/^\d{7}$/.test(codigo)) throw new ValidationError(`Código IBGE inválido: "${codigo}" (esperado 7 dígitos)`);
      return cached(ctx, `ibge:municipio:${codigo}`, () => api.municipioPorCodigo(codigo, options), { ...dedupe(options), ttl: DAY });
    },
  };
}

export type { Estado, Municipio, Regiao } from '../domain/municipio.js';
