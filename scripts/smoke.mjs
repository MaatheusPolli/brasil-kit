// Smoke test do pacote compilado (dist/) em qualquer runtime com fetch: Node, Deno, Bun.
// Usa fetch injetado — nenhuma chamada real de rede.
import { createBrasilClient, NotFoundError, TimeoutError, ValidationError } from '../dist/index.js';
import { createCep } from '../dist/cep.js';
import { createCore } from '../dist/core.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const viacep = { cep: '01001-000', logradouro: 'Praça da Sé', complemento: '', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP', ibge: '3550308', ddd: '11' };

const fetch = async (input, init) => {
  const url = String(input);
  if (url.includes('viacep.com.br/ws/01001000')) return json({}, 503);
  if (url.includes('brasilapi.com.br/api/cep/v2/01001000')) return json({ cep: '01001000', state: 'SP', city: 'São Paulo', neighborhood: 'Sé', street: 'Praça da Sé' });
  if (url.includes('viacep.com.br/ws/99999999')) return json({ erro: 'true' });
  if (url.includes('viacep.com.br/ws/02002000')) return json(viacep);
  if (url.includes('lento')) return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  throw new Error(`rota inesperada: ${url}`);
};

function assert(cond, msg) {
  if (!cond) throw new Error(`FALHOU: ${msg}`);
}

const brasil = createBrasilClient({ fetch, retries: 0 });

const e = await brasil.cep.get('01001-000');
assert(e.fonte === 'brasilapi' && e.uf === 'SP', 'fallback ViaCEP 503 → BrasilAPI');

const nf = await brasil.cep.get('99999999').catch((err) => err);
assert(nf instanceof NotFoundError, 'ViaCEP {erro:true} → NotFoundError');

let invalido;
try { brasil.cep.get('123'); } catch (err) { invalido = err; }
assert(invalido instanceof ValidationError, 'CEP inválido → ValidationError');

const cep = createCep(createCore({ fetch, retries: 0 }));
assert((await cep.get('02002000')).fonte === 'viacep', 'import granular brasil-sdk/cep');

const { createHttp } = await import('../dist/core.js');
const to = await createHttp({ fetch, timeout: 20, retries: 0 }).getJson('https://lento', 'x').catch((err) => err);
assert(to instanceof TimeoutError, 'timeout aborta a requisição');

console.log(`smoke OK (${typeof Deno !== 'undefined' ? 'Deno' : typeof Bun !== 'undefined' ? 'Bun' : 'Node ' + process.version})`);
