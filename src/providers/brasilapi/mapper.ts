import { ProviderError } from '../../core/errors.js';
import { isUF, type UF } from '../../domain/uf.js';
import type { Endereco } from '../../domain/endereco.js';
import type { Empresa, FonteCnpj, Socio } from '../../domain/empresa.js';
import type { Banco, Ddd, Feriado } from '../../domain/outros.js';
import type { BrasilApiBanco, BrasilApiCep, BrasilApiCnpj, BrasilApiDdd, BrasilApiFeriado } from './types.js';

const provider = 'brasilapi';
const text = (v: string | null | undefined) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const uf = (v: string): UF => {
  if (!isUF(v)) throw new ProviderError(`UF inesperada na resposta: ${String(v)}`, { provider });
  return v.toUpperCase() as UF;
};

export function mapBrasilApiCep(raw: BrasilApiCep): Endereco {
  const endereco: Endereco = {
    cep: String(raw.cep).replace(/\D/g, ''),
    logradouro: raw.street ?? '',
    bairro: raw.neighborhood ?? '',
    cidade: raw.city,
    uf: uf(raw.state),
    fonte: 'brasilapi',
  };
  const lat = Number(raw.location?.coordinates?.latitude);
  const lon = Number(raw.location?.coordinates?.longitude);
  if (raw.location?.coordinates?.latitude != null && Number.isFinite(lat) && Number.isFinite(lon))
    endereco.coordenadas = { latitude: lat, longitude: lon };
  return endereco;
}

/** Também usado pela Minha Receita, que tem o mesmo formato (é a fonte da BrasilAPI). */
export function mapBrasilApiCnpj(raw: BrasilApiCnpj, fonte: FonteCnpj = 'brasilapi'): Empresa {
  const logradouro = [text(raw.descricao_tipo_de_logradouro), text(raw.logradouro)].filter(Boolean).join(' ');
  const empresa: Empresa = {
    // Mantém letras: o CNPJ alfanumérico (desde 2026) usa `A-Z` nos 12 primeiros caracteres.
    cnpj: String(raw.cnpj)
      .replace(/[.\-/\s]/g, '')
      .toUpperCase()
      .padStart(14, '0'),
    razaoSocial: raw.razao_social,
    situacao: text(raw.descricao_situacao_cadastral) ?? 'DESCONHECIDA',
    cnaePrincipal: { codigo: String(raw.cnae_fiscal), descricao: raw.cnae_fiscal_descricao },
    cnaesSecundarios: (raw.cnaes_secundarios ?? [])
      .filter((c) => Number(c.codigo) !== 0)
      .map((c) => ({ codigo: String(c.codigo), descricao: c.descricao })),
    endereco: {
      logradouro,
      bairro: raw.bairro,
      cep: String(raw.cep).replace(/\D/g, ''),
      municipio: raw.municipio,
      uf: uf(raw.uf),
    },
    socios: (raw.qsa ?? []).map((s) => {
      const socio: Socio = { nome: s.nome_socio };
      if (text(s.cnpj_cpf_do_socio)) socio.documento = text(s.cnpj_cpf_do_socio);
      if (text(s.qualificacao_socio)) socio.qualificacao = text(s.qualificacao_socio);
      if (text(s.data_entrada_sociedade)) socio.dataEntrada = text(s.data_entrada_sociedade);
      if (text(s.faixa_etaria)) socio.faixaEtaria = text(s.faixa_etaria);
      return socio;
    }),
    fonte,
  };
  const optional = {
    nomeFantasia: text(raw.nome_fantasia),
    dataInicioAtividade: text(raw.data_inicio_atividade),
    naturezaJuridica: text(raw.natureza_juridica),
    porte: text(raw.porte),
    telefone: text(raw.ddd_telefone_1),
    email: text(raw.email),
  };
  for (const [k, v] of Object.entries(optional)) if (v) (empresa as unknown as Record<string, unknown>)[k] = v;
  if (typeof raw.capital_social === 'number') empresa.capitalSocial = raw.capital_social;
  if (text(raw.numero)) empresa.endereco.numero = text(raw.numero);
  if (text(raw.complemento)) empresa.endereco.complemento = text(raw.complemento);
  if (raw.codigo_municipio_ibge != null) empresa.endereco.codigoIbge = String(raw.codigo_municipio_ibge);
  return empresa;
}

export function mapBrasilApiBanco(raw: BrasilApiBanco): Banco {
  return {
    codigo: raw.code,
    ispb: raw.ispb,
    nome: raw.name ?? raw.fullName ?? '',
    nomeCompleto: raw.fullName ?? raw.name ?? '',
    fonte: 'brasilapi',
  };
}

export function mapBrasilApiFeriado(raw: BrasilApiFeriado): Feriado {
  return { data: raw.date, nome: raw.name, tipo: raw.type, fonte: 'brasilapi' };
}

export function mapBrasilApiDdd(ddd: string, raw: BrasilApiDdd): Ddd {
  return { ddd, uf: uf(raw.state), cidades: [...raw.cities].sort((a, b) => a.localeCompare(b, 'pt-BR')), fonte: 'brasilapi' };
}
