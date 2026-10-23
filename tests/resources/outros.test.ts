import { describe, expect, it } from 'vitest';
import { NotFoundError, ProviderError, ValidationError } from '../../src/index.js';
import { client, fixture, ok } from '../helpers.js';

describe('bancos', () => {
  it('list e getByCode', async () => {
    const { brasil } = client([
      ['banks/v1/1', ok(fixture<unknown[]>('brasilapi-bancos')[0])],
      ['banks/v1', ok(fixture('brasilapi-bancos'))],
    ]);
    await expect(brasil.bancos.list()).resolves.toHaveLength(3);
    await expect(brasil.bancos.getByCode('001')).resolves.toMatchObject({ codigo: 1, nomeCompleto: 'Banco do Brasil S.A.' });
  });

  it('não encontrado, resposta inválida e entrada inválida', async () => {
    const { brasil } = client([
      ['banks/v1/999', { status: 404 }],
      ['banks/v1', ok({})],
    ]);
    await expect(brasil.bancos.getByCode(999)).rejects.toBeInstanceOf(NotFoundError);
    await expect(brasil.bancos.list()).rejects.toBeInstanceOf(ProviderError);
    expect(() => brasil.bancos.getByCode('abc')).toThrow(ValidationError);
    expect(() => brasil.bancos.getByCode(0)).toThrow(ValidationError);
  });
});

describe('feriados', () => {
  it('get', async () => {
    const { brasil } = client([['feriados/v1/2026', ok(fixture('brasilapi-feriados-2026'))]]);
    const r = await brasil.feriados.get(2026);
    expect(r[3]).toEqual({ data: '2026-04-21', nome: 'Tiradentes', tipo: 'national', fonte: 'brasilapi' });
  });

  it('ano fora do intervalo e 404', async () => {
    const { brasil } = client([['feriados', { status: 404 }]]);
    expect(() => brasil.feriados.get(1800)).toThrow(ValidationError);
    expect(() => brasil.feriados.get(2026.5)).toThrow(ValidationError);
    await expect(brasil.feriados.get(2199)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ddd', () => {
  it('get', async () => {
    const { brasil } = client([['ddd/v1/11', ok(fixture('brasilapi-ddd-11'))]]);
    await expect(brasil.ddd.get('11')).resolves.toMatchObject({ ddd: '11', uf: 'SP', fonte: 'brasilapi' });
  });

  it('inexistente e inválido', async () => {
    const { brasil } = client([['ddd', { status: 404 }]]);
    await expect(brasil.ddd.get(20)).rejects.toBeInstanceOf(NotFoundError);
    expect(() => brasil.ddd.get(5)).toThrow(ValidationError);
    expect(() => brasil.ddd.get('1a')).toThrow(ValidationError);
  });
});
