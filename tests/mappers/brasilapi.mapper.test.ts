import { describe, expect, it } from 'vitest';
import { mapBrasilApiBanco, mapBrasilApiCep, mapBrasilApiCnpj, mapBrasilApiDdd, mapBrasilApiFeriado } from '../../src/providers/brasilapi/mapper.js';
import { ProviderError } from '../../src/core/errors.js';
import { fixture } from '../helpers.js';

describe('brasilapi mappers', () => {
  it('CEP com coordenadas', () => {
    expect(mapBrasilApiCep(fixture('brasilapi-cep-01001000'))).toEqual({
      cep: '01001000',
      logradouro: 'Praça da Sé',
      bairro: 'Sé',
      cidade: 'São Paulo',
      uf: 'SP',
      coordenadas: { latitude: -23.5503, longitude: -46.6339 },
      fonte: 'brasilapi',
    });
  });

  it('CEP sem coordenadas, rua ou bairro', () => {
    const e = mapBrasilApiCep({ cep: '12345678', state: 'MG', city: 'X', street: null, neighborhood: null, location: { coordinates: {} } });
    expect(e).not.toHaveProperty('coordenadas');
    expect(e).toMatchObject({ logradouro: '', bairro: '' });
  });

  it('UF inválida → ProviderError', () => {
    expect(() => mapBrasilApiCep({ cep: '1', state: 'XX', city: 'X', street: null, neighborhood: null })).toThrow(ProviderError);
  });

  it('CNPJ completo', () => {
    const e = mapBrasilApiCnpj(fixture('brasilapi-cnpj'));
    expect(e).toMatchObject({
      cnpj: '00000000000191',
      razaoSocial: 'BANCO DO BRASIL SA',
      nomeFantasia: 'DIRECAO GERAL',
      situacao: 'ATIVA',
      capitalSocial: 120000000000,
      telefone: '6134939002',
      cnaePrincipal: { codigo: '6422100' },
      endereco: { logradouro: 'SETOR SAUN QUADRA 5 LOTE B TORRES I, II E III', numero: 'SN', uf: 'DF', codigoIbge: '5300108' },
      socios: [{ nome: 'MARIA EXEMPLO DA SILVA', qualificacao: 'Presidente', dataEntrada: '2023-01-16' }],
      fonte: 'brasilapi',
    });
    expect(e.cnaesSecundarios).toHaveLength(1);
    expect(e).not.toHaveProperty('email');
  });

  it('CNPJ mínimo', () => {
    const e = mapBrasilApiCnpj({
      cnpj: '191', razao_social: 'X', cnae_fiscal: 1, cnae_fiscal_descricao: 'd', logradouro: 'R', bairro: 'B', cep: '1', municipio: 'M', uf: 'SP',
    });
    expect(e).toMatchObject({ cnpj: '00000000000191', situacao: 'DESCONHECIDA', cnaesSecundarios: [], socios: [] });
  });

  it('bancos, feriados e DDD', () => {
    const [bb, , bcb] = fixture<never[]>('brasilapi-bancos').map(mapBrasilApiBanco);
    expect(bb).toEqual({ codigo: 1, ispb: '00000000', nome: 'BCO DO BRASIL S.A.', nomeCompleto: 'Banco do Brasil S.A.', fonte: 'brasilapi' });
    expect(bcb?.codigo).toBeNull();
    expect(mapBrasilApiBanco({ ispb: '1', name: null, code: 2, fullName: null })).toMatchObject({ nome: '', nomeCompleto: '' });
    expect(mapBrasilApiFeriado({ date: '2026-04-21', name: 'Tiradentes', type: 'national' })).toEqual({ data: '2026-04-21', nome: 'Tiradentes', tipo: 'national', fonte: 'brasilapi' });
    expect(mapBrasilApiDdd('11', fixture('brasilapi-ddd-11')).cidades).toEqual(['BARUERI', 'GUARULHOS', 'OSASCO', 'SÃO PAULO']);
  });
});
