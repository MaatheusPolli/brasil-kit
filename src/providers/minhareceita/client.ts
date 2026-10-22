import type { HttpClient, RequestOptions } from '../../core/http.js';
import { mapBrasilApiCnpj } from '../brasilapi/mapper.js';
import type { BrasilApiCnpj } from '../brasilapi/types.js';

export const MINHARECEITA_URL = 'https://minhareceita.org';

/** Minha Receita: base aberta da Receita Federal, mesmo formato do CNPJ da BrasilAPI. */
export function createMinhaReceita(http: HttpClient, baseUrl = MINHARECEITA_URL) {
  return {
    name: 'minhareceita' as const,
    getCnpj: async (cnpj: string, options?: RequestOptions) =>
      mapBrasilApiCnpj(await http.getJson<BrasilApiCnpj>(`${baseUrl}/${cnpj}`, 'minhareceita', options), 'minhareceita'),
  };
}
