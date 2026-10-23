import { NotFoundError, ProviderError } from '../../core/errors.js';
import { isUF, type UF } from '../../domain/uf.js';
import type { Endereco } from '../../domain/endereco.js';
import type { ViaCepEndereco, ViaCepResponse } from './types.js';

const blank = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

export function isViaCepErro(raw: unknown): boolean {
  return typeof raw === 'object' && raw !== null && 'erro' in raw && String(raw.erro) === 'true';
}

export function mapViaCepEndereco(raw: ViaCepResponse): Endereco {
  if (isViaCepErro(raw)) throw new NotFoundError('CEP não encontrado', { provider: 'viacep' });
  const r = raw as ViaCepEndereco;
  if (typeof r.cep !== 'string' || !isUF(r.uf)) throw new ProviderError('Resposta inesperada do ViaCEP', { provider: 'viacep' });
  const endereco: Endereco = {
    cep: r.cep.replace(/\D/g, ''),
    logradouro: r.logradouro ?? '',
    bairro: r.bairro ?? '',
    cidade: r.localidade,
    uf: r.uf.toUpperCase() as UF,
    fonte: 'viacep',
  };
  const complemento = blank(r.complemento);
  if (complemento) endereco.complemento = complemento;
  const ibge = blank(r.ibge);
  if (ibge) endereco.codigoIbge = ibge;
  const ddd = blank(r.ddd);
  if (ddd) endereco.ddd = ddd;
  return endereco;
}
