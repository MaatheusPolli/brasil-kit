import { describe, expect, it } from 'vitest';
import { NotFoundError, ProviderError, ValidationError } from '../../src/index.js';
import { client, fixture, ok } from '../helpers.js';

describe('ibge', () => {
  it('estados', async () => {
    const { brasil } = client([['localidades/estados?orderBy=nome', ok(fixture('ibge-estados'))]]);
    await expect(brasil.ibge.estados()).resolves.toEqual([
      { id: 12, sigla: 'AC', nome: 'Acre', regiao: { id: 1, sigla: 'N', nome: 'Norte' } },
      { id: 35, sigla: 'SP', nome: 'São Paulo', regiao: { id: 3, sigla: 'SE', nome: 'Sudeste' } },
    ]);
  });

  it('municipiosPorUf', async () => {
    const { brasil, fetch } = client([['estados/MT/municipios', ok([fixture('ibge-municipio-sem-microrregiao')])]]);
    await expect(brasil.ibge.municipiosPorUf('mt')).resolves.toMatchObject([{ codigo: '5101837', uf: 'MT' }]);
    await brasil.ibge.municipiosPorUf('MT');
    expect(fetch.calls).toHaveLength(1);
  });

  it('municipioPorCodigo aceita objeto ou lista', async () => {
    const m = fixture('ibge-municipio-3550308');
    const { brasil } = client([
      ['municipios/3550308', ok(m)],
      ['municipios/3304557', ok([{ ...(m as object), id: 3304557 }])],
    ]);
    await expect(brasil.ibge.municipioPorCodigo(3550308)).resolves.toMatchObject({ nome: 'São Paulo' });
    await expect(brasil.ibge.municipioPorCodigo('3304557')).resolves.toMatchObject({ codigo: '3304557' });
  });

  it('código inexistente (IBGE responde []) → NotFoundError', async () => {
    const { brasil } = client([['municipios/', ok([])]]);
    await expect(brasil.ibge.municipioPorCodigo('1234567')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('respostas não-lista → ProviderError', async () => {
    const { brasil } = client([['localidades', ok({})]]);
    await expect(brasil.ibge.estados()).rejects.toBeInstanceOf(ProviderError);
    await expect(brasil.ibge.municipiosPorUf('SP')).rejects.toBeInstanceOf(ProviderError);
  });

  it('entradas inválidas', () => {
    const { brasil } = client([]);
    expect(() => brasil.ibge.municipiosPorUf('XY')).toThrow(ValidationError);
    expect(() => brasil.ibge.municipioPorCodigo('123')).toThrow(ValidationError);
  });
});
