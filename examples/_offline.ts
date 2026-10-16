/**
 * Com BRASILKIT_OFFLINE=1 os exemplos usam respostas gravadas (tests/fixtures),
 * para rodar na CI sem depender dos serviços externos.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const fx = (name: string) => readFileSync(join(process.cwd(), 'tests', 'fixtures', `${name}.json`), 'utf8');

const routes: Array<[RegExp, string]> = [
  [/viacep\.com\.br\/ws\/01001000/, 'viacep-01001000'],
  [/viacep\.com\.br\/ws\/RS\//, 'viacep-search'],
  [/cnpj\/v1\//, 'brasilapi-cnpj'],
  [/estados\/SP\/municipios/, 'ibge-municipio-3550308'],
  [/feriados\/v1\//, 'brasilapi-feriados-2026'],
  [/ddd\/v1\//, 'brasilapi-ddd-11'],
];

const offlineFetch: typeof fetch = async (input) => {
  const url = String(input);
  const route = routes.find(([re]) => re.test(url));
  if (!route) return new Response('{"message":"não gravado"}', { status: 404 });
  let body = fx(route[1]);
  if (route[1] === 'ibge-municipio-3550308') body = `[${body}]`;
  return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
};

export const fetchParaExemplo: typeof fetch | undefined = process.env.BRASILKIT_OFFLINE ? offlineFetch : undefined;
