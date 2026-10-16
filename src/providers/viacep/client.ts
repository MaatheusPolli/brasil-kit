import type { HttpClient } from '../../core/http.js';
import { ProviderError } from '../../core/errors.js';
import type { Endereco } from '../../domain/endereco.js';
import type { UF } from '../../domain/uf.js';
import { mapViaCepEndereco } from './mapper.js';
import type { ViaCepEndereco, ViaCepResponse } from './types.js';

export const VIACEP_URL = 'https://viacep.com.br/ws';

export function createViaCep(http: HttpClient, baseUrl = VIACEP_URL) {
  return {
    name: 'viacep' as const,
    async getCep(cep: string): Promise<Endereco> {
      return mapViaCepEndereco(await http.getJson<ViaCepResponse>(`${baseUrl}/${cep}/json/`, 'viacep'));
    },
    async search(uf: UF, cidade: string, logradouro: string): Promise<Endereco[]> {
      const path = [uf, cidade, logradouro].map(encodeURIComponent).join('/');
      const raw = await http.getJson<ViaCepEndereco[]>(`${baseUrl}/${path}/json/`, 'viacep');
      if (!Array.isArray(raw)) throw new ProviderError('Resposta inesperada do ViaCEP', { provider: 'viacep' });
      return raw.map(mapViaCepEndereco);
    },
  };
}

export type ViaCepProvider = ReturnType<typeof createViaCep>;
