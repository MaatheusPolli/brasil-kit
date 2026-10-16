import type { UF } from './uf.js';

export type FonteCnpj = 'brasilapi' | 'minhareceita';

export interface Cnae {
  codigo: string;
  descricao: string;
}

export interface Socio {
  nome: string;
  documento?: string;
  qualificacao?: string;
  dataEntrada?: string;
  faixaEtaria?: string;
}

export interface Empresa {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacao: string;
  dataInicioAtividade?: string;
  naturezaJuridica?: string;
  porte?: string;
  capitalSocial?: number;
  cnaePrincipal: Cnae;
  cnaesSecundarios: Cnae[];
  endereco: {
    logradouro: string;
    numero?: string;
    complemento?: string;
    bairro: string;
    cep: string;
    municipio: string;
    uf: UF;
    codigoIbge?: string;
  };
  telefone?: string;
  email?: string;
  socios: Socio[];
  fonte: FonteCnpj;
}
