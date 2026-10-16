export interface BrasilApiCep {
  cep: string;
  state: string;
  city: string;
  neighborhood: string | null;
  street: string | null;
  service?: string;
  location?: {
    type?: string;
    coordinates?: { longitude?: string | number; latitude?: string | number };
  };
}

export interface BrasilApiCnpj {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string | null;
  descricao_situacao_cadastral?: string | null;
  data_inicio_atividade?: string | null;
  natureza_juridica?: string | null;
  porte?: string | null;
  capital_social?: number | null;
  cnae_fiscal: number | string;
  cnae_fiscal_descricao: string;
  cnaes_secundarios?: Array<{ codigo: number | string; descricao: string }> | null;
  logradouro: string;
  descricao_tipo_de_logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro: string;
  cep: string;
  municipio: string;
  uf: string;
  codigo_municipio_ibge?: number | string | null;
  ddd_telefone_1?: string | null;
  email?: string | null;
  qsa?: Array<{
    nome_socio: string;
    cnpj_cpf_do_socio?: string | null;
    qualificacao_socio?: string | null;
    data_entrada_sociedade?: string | null;
    faixa_etaria?: string | null;
  }> | null;
}

export interface BrasilApiBanco {
  ispb: string;
  name: string | null;
  code: number | null;
  fullName: string | null;
}

export interface BrasilApiFeriado {
  date: string;
  name: string;
  type: string;
}

export interface BrasilApiDdd {
  state: string;
  cities: string[];
}
