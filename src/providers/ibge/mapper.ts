import { ProviderError } from '../../core/errors.js';
import { isUF } from '../../domain/uf.js';
import type { Estado, Municipio } from '../../domain/municipio.js';
import type { IbgeMunicipio, IbgeUF } from './types.js';

export function mapIbgeEstado(raw: IbgeUF): Estado {
  if (!isUF(raw.sigla)) throw new ProviderError(`UF inesperada do IBGE: ${raw.sigla}`, { provider: 'ibge' });
  return {
    id: raw.id,
    sigla: raw.sigla,
    nome: raw.nome,
    regiao: { id: raw.regiao.id, sigla: raw.regiao.sigla, nome: raw.regiao.nome },
  };
}

export function mapIbgeMunicipio(raw: IbgeMunicipio): Municipio {
  // Alguns municípios novos vêm com `microrregiao: null`; a região imediata sempre traz a UF.
  const ufRaw = raw.microrregiao?.mesorregiao?.UF ?? raw['regiao-imediata']?.['regiao-intermediaria']?.UF;
  if (!ufRaw) throw new ProviderError(`Município ${raw.id} sem UF na resposta do IBGE`, { provider: 'ibge' });
  const estado = mapIbgeEstado(ufRaw);
  return { codigo: String(raw.id), nome: raw.nome, uf: estado.sigla, estado: estado.nome, regiao: estado.regiao, fonte: 'ibge' };
}
