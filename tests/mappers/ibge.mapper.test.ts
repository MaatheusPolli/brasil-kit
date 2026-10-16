import { describe, expect, it } from 'vitest';
import { mapIbgeEstado, mapIbgeMunicipio } from '../../src/providers/ibge/mapper.js';
import { ProviderError } from '../../src/core/errors.js';
import { fixture } from '../helpers.js';

const sudeste = { id: 3, sigla: 'SE', nome: 'Sudeste' };

describe('ibge mappers', () => {
  it('município via microrregião', () => {
    expect(mapIbgeMunicipio(fixture('ibge-municipio-3550308'))).toEqual({
      codigo: '3550308', nome: 'São Paulo', uf: 'SP', estado: 'São Paulo', regiao: sudeste, fonte: 'ibge',
    });
  });

  it('município com microrregiao null usa a região imediata', () => {
    expect(mapIbgeMunicipio(fixture('ibge-municipio-sem-microrregiao'))).toMatchObject({ uf: 'MT', regiao: { sigla: 'CO' } });
  });

  it('sem UF ou UF inválida → ProviderError', () => {
    expect(() => mapIbgeMunicipio({ id: 1, nome: 'x' })).toThrow(ProviderError);
    expect(() => mapIbgeEstado({ id: 1, sigla: 'ZZ', nome: 'x', regiao: sudeste })).toThrow(ProviderError);
  });
});
