import type { HttpClient, RequestOptions } from '../../core/http.js';
import { NotFoundError, ProviderError } from '../../core/errors.js';
import type { UF } from '../../domain/uf.js';
import { mapIbgeEstado, mapIbgeMunicipio } from './mapper.js';
import type { IbgeMunicipio, IbgeUF } from './types.js';

export const IBGE_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades';
const P = 'ibge';

export function createIbge(http: HttpClient, baseUrl = IBGE_URL) {
  return {
    name: P,
    async estados(options?: RequestOptions) {
      const raw = await http.getJson<IbgeUF[]>(`${baseUrl}/estados?orderBy=nome`, P, options);
      if (!Array.isArray(raw)) throw new ProviderError('Resposta inesperada do IBGE', { provider: P });
      return raw.map(mapIbgeEstado);
    },
    async municipiosPorUf(uf: UF, options?: RequestOptions) {
      const raw = await http.getJson<IbgeMunicipio[]>(`${baseUrl}/estados/${uf}/municipios?orderBy=nome`, P, options);
      if (!Array.isArray(raw)) throw new ProviderError('Resposta inesperada do IBGE', { provider: P });
      return raw.map(mapIbgeMunicipio);
    },
    async municipioPorCodigo(codigo: string, options?: RequestOptions) {
      // O IBGE responde 200 com `[]` para código inexistente.
      const raw = await http.getJson<IbgeMunicipio | IbgeMunicipio[]>(`${baseUrl}/municipios/${codigo}`, P, options);
      const item = Array.isArray(raw) ? raw[0] : raw;
      if (!item || typeof item !== 'object' || !('id' in item)) throw new NotFoundError(`Município ${codigo} não encontrado`, { provider: P });
      return mapIbgeMunicipio(item);
    },
  };
}

export type IbgeProvider = ReturnType<typeof createIbge>;
