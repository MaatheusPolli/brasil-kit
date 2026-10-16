import type { UF } from './uf.js';

export interface Banco {
  codigo: number | null;
  ispb: string;
  nome: string;
  nomeCompleto: string;
  fonte: 'brasilapi';
}

export interface Feriado {
  /** Data ISO (AAAA-MM-DD). */
  data: string;
  nome: string;
  tipo: string;
  fonte: 'brasilapi';
}

export interface Ddd {
  ddd: string;
  uf: UF;
  cidades: string[];
  fonte: 'brasilapi';
}
