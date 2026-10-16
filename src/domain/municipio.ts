import type { UF } from './uf.js';

export interface Regiao {
  id: number;
  sigla: string;
  nome: string;
}

export interface Estado {
  id: number;
  sigla: UF;
  nome: string;
  regiao: Regiao;
}

export interface Municipio {
  /** Código IBGE de 7 dígitos. */
  codigo: string;
  nome: string;
  uf: UF;
  estado: string;
  regiao: Regiao;
  fonte: 'ibge';
}
