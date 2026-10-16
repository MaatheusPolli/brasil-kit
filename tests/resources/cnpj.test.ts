import { describe, expect, it } from 'vitest';
import { NotFoundError, ValidationError } from '../../src/index.js';
import { client, fixture, ok } from '../helpers.js';

describe('cnpj.get', () => {
  it('sucesso com máscara', async () => {
    const { brasil, fetch } = client([['brasilapi.com.br/api/cnpj/v1/00000000000191', ok(fixture('brasilapi-cnpj'))]]);
    await expect(brasil.cnpj.get('00.000.000/0001-91')).resolves.toMatchObject({ razaoSocial: 'BANCO DO BRASIL SA', socios: [{}] });
    await brasil.cnpj.get('00000000000191');
    expect(fetch.calls).toHaveLength(1);
  });

  it('BrasilAPI bloqueada (403) → Minha Receita assume', async () => {
    const { brasil, fetch } = client([
      ['brasilapi.com.br/api/cnpj', { status: 403 }],
      ['minhareceita.org/00000000000191', ok(fixture('brasilapi-cnpj'))],
    ]);
    await expect(brasil.cnpj.get('00000000000191')).resolves.toMatchObject({ razaoSocial: 'BANCO DO BRASIL SA', fonte: 'minhareceita' });
    expect(fetch.calls).toHaveLength(2);
  });

  it('BrasilAPI fora (500) → Minha Receita; ordem configurável', async () => {
    const a = client([['brasilapi', { status: 500 }], ['minhareceita', ok(fixture('brasilapi-cnpj'))]]);
    await expect(a.brasil.cnpj.get('00000000000191')).resolves.toMatchObject({ fonte: 'minhareceita' });
    const b = client([['minhareceita', ok(fixture('brasilapi-cnpj'))]], { cnpj: { providers: ['minhareceita'] } });
    await expect(b.brasil.cnpj.get('00000000000191')).resolves.toMatchObject({ fonte: 'minhareceita' });
    expect(b.fetch.calls).toHaveLength(1);
  });

  it('não encontrado', async () => {
    const { brasil } = client([['cnpj', { status: 404, body: { message: 'CNPJ não encontrado' } }]]);
    await expect(brasil.cnpj.get('11222333000181')).rejects.toBeInstanceOf(NotFoundError);
  });

  it.each(['123', '00000000000192', '11111111111111', '11222333000180'])('inválido %s', (cnpj) => {
    const { brasil } = client([]);
    expect(() => brasil.cnpj.get(cnpj)).toThrow(ValidationError);
  });
});
