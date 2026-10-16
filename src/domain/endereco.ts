import type { UF } from './uf.js';

export type FonteCep = 'viacep' | 'brasilapi';

export interface Coordenadas {
  latitude: number;
  longitude: number;
}

export interface Endereco {
  cep: string;
  logradouro: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: UF;
  codigoIbge?: string;
  ddd?: string;
  coordenadas?: Coordenadas;
  /** Provider que respondeu — transparência sobre a origem. */
  fonte: FonteCep;
}

export interface BuscaEnderecoParams {
  uf: UF | string;
  cidade: string;
  logradouro: string;
}
