import { describe, expect, it } from 'vitest';
import { NotFoundError, ProviderError, ValidationError } from '../../src/index.js';
import { client, fixture, ok } from '../helpers.js';

const viacep = fixture('viacep-01001000');
const brasilapi = fixture('brasilapi-cep-01001000');

describe('cep.get', () => {
  it('sucesso pelo ViaCEP, aceitando máscara', async () => {
    const { brasil, fetch } = client([['viacep.com.br/ws/01001000/json/', ok(viacep)]]);
    await expect(brasil.cep.get('01001-000')).resolves.toMatchObject({ cep: '01001000', fonte: 'viacep' });
    expect(fetch.calls).toHaveLength(1);
  });

  it('ViaCEP fora do ar (500) → BrasilAPI assume', async () => {
    const { brasil } = client([['viacep', { status: 500 }], ['brasilapi.com.br/api/cep/v2/01001000', ok(brasilapi)]]);
    await expect(brasil.cep.get('01001000')).resolves.toMatchObject({ fonte: 'brasilapi', coordenadas: { latitude: -23.5503 } });
  });

  it('ViaCEP com erro de rede → BrasilAPI assume', async () => {
    const { brasil } = client([['viacep', new TypeError('fetch failed')], ['brasilapi', ok(brasilapi)]]);
    await expect(brasil.cep.get('01001000')).resolves.toMatchObject({ fonte: 'brasilapi' });
  });

  it('não encontrado ({erro:true}) → NotFoundError sem fallback', async () => {
    const { brasil, fetch } = client([['viacep', ok({ erro: 'true' })], ['brasilapi', ok(brasilapi)]]);
    await expect(brasil.cep.get('99999999')).rejects.toBeInstanceOf(NotFoundError);
    expect(fetch.calls.every((u) => u.includes('viacep'))).toBe(true);
  });

  it('ambos fora → ProviderError', async () => {
    const { brasil } = client([['viacep', { status: 502 }], ['brasilapi', { status: 503 }]]);
    await expect(brasil.cep.get('01001000')).rejects.toMatchObject({ provider: 'brasilapi', status: 503 });
  });

  it('ordem de providers configurável', async () => {
    const { brasil, fetch } = client([['brasilapi', ok(brasilapi)]], { cep: { providers: ['brasilapi'] } });
    await expect(brasil.cep.get('01001000')).resolves.toMatchObject({ fonte: 'brasilapi' });
    expect(fetch.calls).toHaveLength(1);
  });

  it('usa cache na segunda chamada', async () => {
    const { brasil, fetch } = client([['viacep', ok(viacep)]]);
    await brasil.cep.get('01001000');
    await brasil.cep.get('01001-000');
    expect(fetch.calls).toHaveLength(1);
    await brasil.clearCache();
    await brasil.cep.get('01001000');
    expect(fetch.calls).toHaveLength(2);
  });

  it.each(['123', '0100100a', '010010000', '', ' 01.001-000'])('entrada inválida %j → ValidationError sem rede', async (cep) => {
    const { brasil, fetch } = client([]);
    expect(() => brasil.cep.get(cep)).toThrow(ValidationError);
    expect(() => brasil.cep.get(undefined as never)).toThrow(ValidationError);
    expect(fetch.calls).toHaveLength(0);
  });
});

describe('cep.search', () => {
  it('sucesso', async () => {
    const { brasil, fetch } = client([['viacep.com.br/ws/RS/Porto%20Alegre/Domingos%20Jos%C3%A9/json/', ok(fixture('viacep-search'))]]);
    const r = await brasil.cep.search({ uf: 'rs', cidade: 'Porto Alegre', logradouro: 'Domingos José' });
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ uf: 'RS', fonte: 'viacep' });
    await brasil.cep.search({ uf: 'RS', cidade: 'porto alegre', logradouro: 'domingos josé' });
    expect(fetch.calls).toHaveLength(1);
  });

  it('não encontrado → lista vazia', async () => {
    const { brasil } = client([['viacep', ok([])]]);
    await expect(brasil.cep.search({ uf: 'SP', cidade: 'São Paulo', logradouro: 'Inexistente' })).resolves.toEqual([]);
  });

  it('resposta que não é lista → ProviderError', async () => {
    const { brasil } = client([['viacep', ok({ erro: true })]]);
    await expect(brasil.cep.search({ uf: 'SP', cidade: 'São Paulo', logradouro: 'Rua' })).rejects.toBeInstanceOf(ProviderError);
  });

  it.each([
    { uf: 'XX', cidade: 'São Paulo', logradouro: 'Paulista' },
    { uf: 'SP', cidade: 'SP', logradouro: 'Paulista' },
    { uf: 'SP', cidade: 'São Paulo', logradouro: '  a ' },
  ])('entrada inválida %j', (params) => {
    const { brasil } = client([]);
    expect(() => brasil.cep.search(params)).toThrow(ValidationError);
  });
});
