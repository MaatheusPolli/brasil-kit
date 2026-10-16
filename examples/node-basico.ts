import { createBrasilClient, NotFoundError } from '../src/index.js';
import { fetchParaExemplo } from './_offline.js';

const brasil = createBrasilClient({
  timeout: 5000,
  cache: 'memory',
  fetch: fetchParaExemplo,
  interceptors: {
    onResponse: ({ provider, status, durationMs }) => console.log(`  ↳ ${provider} HTTP ${status} em ${durationMs}ms`),
  },
});

const endereco = await brasil.cep.get('01001-000');
console.log('CEP:', endereco.logradouro, '-', endereco.cidade, endereco.uf, `(fonte: ${endereco.fonte})`);

const busca = await brasil.cep.search({ uf: 'RS', cidade: 'Porto Alegre', logradouro: 'Domingos José' });
console.log('Busca por endereço:', busca.map((e) => e.cep).join(', '));

const empresa = await brasil.cnpj.get('00.000.000/0001-91');
console.log('CNPJ:', empresa.razaoSocial, '·', empresa.cnaePrincipal.descricao);

const municipios = await brasil.ibge.municipiosPorUf('SP');
console.log('Municípios de SP:', municipios.length);

const feriados = await brasil.feriados.get(2026);
console.log('Feriados 2026:', feriados.map((f) => `${f.data} ${f.nome}`).join(' | '));

const ddd = await brasil.ddd.get(11);
console.log('DDD 11:', ddd.uf, ddd.cidades.slice(0, 3).join(', '), '...');

try {
  await brasil.cep.get('99999-999');
} catch (err) {
  if (err instanceof NotFoundError) console.log('CEP 99999-999: não encontrado (NotFoundError)');
  else throw err;
}
