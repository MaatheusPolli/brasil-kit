import { cached, type CoreContext } from '../core/context.js';
import { ValidationError } from '../core/errors.js';
import { normalizeUf } from '../core/validate.js';
import type { Estado, Municipio } from '../domain/municipio.js';
import type { UF } from '../domain/uf.js';
import { createIbge as createIbgeProvider } from '../providers/ibge/client.js';

const DAY = 24 * 60 * 60 * 1000;

export interface IbgeResource {
  estados(): Promise<Estado[]>;
  municipiosPorUf(uf: UF | string): Promise<Municipio[]>;
  /** Código IBGE de 7 dígitos (ex.: `3550308` para São Paulo). */
  municipioPorCodigo(codigo: string | number): Promise<Municipio>;
}

export function createIbge(ctx: CoreContext): IbgeResource {
  const api = createIbgeProvider(ctx.http);
  return {
    estados: () => cached(ctx, 'ibge:estados', () => api.estados(), DAY),
    municipiosPorUf(input) {
      const uf = normalizeUf(input);
      return cached(ctx, `ibge:municipios:${uf}`, () => api.municipiosPorUf(uf), DAY);
    },
    municipioPorCodigo(input) {
      const codigo = String(input).trim();
      if (!/^\d{7}$/.test(codigo)) throw new ValidationError(`Código IBGE inválido: "${codigo}" (esperado 7 dígitos)`);
      return cached(ctx, `ibge:municipio:${codigo}`, () => api.municipioPorCodigo(codigo), DAY);
    },
  };
}

export type { Estado, Municipio, Regiao } from '../domain/municipio.js';
