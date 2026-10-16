/**
 * Testes de integração contra as APIs REAIS. Não rodam no `npm test`.
 * Execute com `npm run test:live` (ou via workflow "APIs reais" / Docker).
 */
import { describe, expect, it } from 'vitest';
import { createBrasilClient, NotFoundError, UFS } from '../../src/index.js';

const opts = { timeout: 15_000, retries: 2, cache: 'none' as const };
const brasil = createBrasilClient(opts);
const soViaCep = createBrasilClient({ ...opts, cep: { providers: ['viacep'] } });
const soBrasilApi = createBrasilClient({ ...opts, cep: { providers: ['brasilapi'] } });

describe('CEP', () => {
  it('ViaCEP: 01001-000', async () => {
    expect(await soViaCep.cep.get('01001-000')).toMatchObject({
      cep: '01001000', uf: 'SP', cidade: 'São Paulo', codigoIbge: '3550308', ddd: '11', fonte: 'viacep',
    });
  });

  it('BrasilAPI: 01001-000', async () => {
    expect(await soBrasilApi.cep.get('01001000')).toMatchObject({ cep: '01001000', uf: 'SP', cidade: 'São Paulo', fonte: 'brasilapi' });
  });

  it('CEP inexistente → NotFoundError', async () => {
    await expect(soViaCep.cep.get('99999-999')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('busca por endereço', async () => {
    const r = await brasil.cep.search({ uf: 'SP', cidade: 'São Paulo', logradouro: 'Paulista' });
    expect(r.length).toBeGreaterThan(0);
    expect(r[0]).toMatchObject({ uf: 'SP', fonte: 'viacep' });
  });
});

describe('CNPJ', () => {
  const confere = (e: Awaited<ReturnType<typeof brasil.cnpj.get>>) => {
    expect(e).toMatchObject({ cnpj: '00000000000191', endereco: { uf: 'DF' } });
    expect(e.razaoSocial).toMatch(/BANCO DO BRASIL/);
    expect(e.cnaePrincipal.codigo).toMatch(/^\d+$/);
  };

  it('Banco do Brasil (com fallback)', async () => {
    const e = await brasil.cnpj.get('00.000.000/0001-91');
    confere(e);
    console.info(`CNPJ respondido por: ${e.fonte}`);
  });

  it('Minha Receita direto', async () => {
    const e = await createBrasilClient({ ...opts, cnpj: { providers: ['minhareceita'] } }).cnpj.get('00000000000191');
    confere(e);
    expect(e.fonte).toBe('minhareceita');
  });
});

describe('IBGE', () => {
  it('27 estados', async () => {
    const estados = await brasil.ibge.estados();
    expect(estados).toHaveLength(27);
    expect(estados.map((e) => e.sigla).sort()).toEqual([...UFS].sort());
  });

  it('municípios de SP', async () => {
    const m = await brasil.ibge.municipiosPorUf('SP');
    expect(m.length).toBeGreaterThan(600);
    expect(m.every((x) => x.uf === 'SP' && /^\d{7}$/.test(x.codigo))).toBe(true);
  });

  it('municípios de MT (inclui microrregiao null)', async () => {
    const m = await brasil.ibge.municipiosPorUf('MT');
    expect(m.length).toBeGreaterThan(140);
  });

  it('município por código e código inexistente', async () => {
    expect(await brasil.ibge.municipioPorCodigo(3550308)).toMatchObject({ nome: 'São Paulo', uf: 'SP' });
    await expect(brasil.ibge.municipioPorCodigo('1234567')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('Bancos, feriados e DDD', () => {
  it('bancos', async () => {
    expect((await brasil.bancos.list()).length).toBeGreaterThan(100);
    expect(await brasil.bancos.getByCode('001')).toMatchObject({ codigo: 1 });
  });

  it('feriados 2026', async () => {
    const f = await brasil.feriados.get(2026);
    expect(f.some((x) => x.data === '2026-04-21')).toBe(true);
  });

  it('DDD 11', async () => {
    const d = await brasil.ddd.get(11);
    expect(d.uf).toBe('SP');
    expect(d.cidades.length).toBeGreaterThan(10);
  });
});
