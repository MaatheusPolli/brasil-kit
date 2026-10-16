import { describe, expect, it } from 'vitest';
import { mapViaCepEndereco, isViaCepErro } from '../../src/providers/viacep/mapper.js';
import { NotFoundError, ProviderError } from '../../src/core/errors.js';
import { fixture } from '../helpers.js';

describe('viacep mapper', () => {
  it('fixture real → Endereco canônico', () => {
    expect(mapViaCepEndereco(fixture('viacep-01001000'))).toEqual({
      cep: '01001000',
      logradouro: 'Praça da Sé',
      complemento: 'lado ímpar',
      bairro: 'Sé',
      cidade: 'São Paulo',
      uf: 'SP',
      codigoIbge: '3550308',
      ddd: '11',
      fonte: 'viacep',
    });
  });

  it('omite campos vazios', () => {
    const [first] = fixture<never[]>('viacep-search').map(mapViaCepEndereco);
    expect(first).not.toHaveProperty('complemento');
    expect(first).toMatchObject({ cep: '91790072', uf: 'RS' });
  });

  it('200 com {erro:true} → NotFoundError', () => {
    expect(isViaCepErro(fixture('viacep-erro'))).toBe(true);
    expect(isViaCepErro({ erro: true })).toBe(true);
    expect(() => mapViaCepEndereco(fixture('viacep-erro'))).toThrow(NotFoundError);
  });

  it('formato inesperado → ProviderError', () => {
    expect(() => mapViaCepEndereco({ foo: 1 } as never)).toThrow(ProviderError);
  });
});
