import type { HttpClient } from '../../core/http.js';
import { ProviderError } from '../../core/errors.js';
import { mapBrasilApiBanco, mapBrasilApiCep, mapBrasilApiCnpj, mapBrasilApiDdd, mapBrasilApiFeriado } from './mapper.js';
import type { BrasilApiBanco, BrasilApiCep, BrasilApiCnpj, BrasilApiDdd, BrasilApiFeriado } from './types.js';

export const BRASILAPI_URL = 'https://brasilapi.com.br/api';
const P = 'brasilapi';

function asArray<T>(raw: unknown): T[] {
  if (!Array.isArray(raw)) throw new ProviderError('Resposta inesperada da BrasilAPI', { provider: P });
  return raw as T[];
}

export function createBrasilApi(http: HttpClient, baseUrl = BRASILAPI_URL) {
  return {
    name: P,
    getCep: async (cep: string) => mapBrasilApiCep(await http.getJson<BrasilApiCep>(`${baseUrl}/cep/v2/${cep}`, P)),
    getCnpj: async (cnpj: string) => mapBrasilApiCnpj(await http.getJson<BrasilApiCnpj>(`${baseUrl}/cnpj/v1/${cnpj}`, P)),
    listBancos: async () => asArray<BrasilApiBanco>(await http.getJson(`${baseUrl}/banks/v1`, P)).map(mapBrasilApiBanco),
    getBanco: async (code: number) => mapBrasilApiBanco(await http.getJson<BrasilApiBanco>(`${baseUrl}/banks/v1/${code}`, P)),
    getFeriados: async (ano: number) =>
      asArray<BrasilApiFeriado>(await http.getJson(`${baseUrl}/feriados/v1/${ano}`, P)).map(mapBrasilApiFeriado),
    getDdd: async (ddd: string) => mapBrasilApiDdd(ddd, await http.getJson<BrasilApiDdd>(`${baseUrl}/ddd/v1/${ddd}`, P)),
  };
}

export type BrasilApiProvider = ReturnType<typeof createBrasilApi>;
