# BrasilKit

> SDK TypeScript para APIs pÃºblicas brasileiras (ViaCEP, BrasilAPI, IBGE), com tipos completos, cache, retry, fallback entre provedores e suporte a Node e browser.

[![CI](https://github.com/MaatheusPolli/brasil-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/MaatheusPolli/brasil-kit/actions/workflows/ci.yml)
[![LicenÃ§a: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue.svg)](LICENSE)

## Por que existe

Consumir o ViaCEP ou o IBGE Ã© fÃ¡cil; consumir **bem** nÃ£o Ã©. Cada projeto acaba reimplementando as mesmas coisas:

- a tipagem do retorno de cada API;
- o "CEP nÃ£o encontrado" do ViaCEP, que chega como **HTTP 200** com `{ "erro": true }`;
- timeout, retry e cache;
- um plano B quando o serviÃ§o cai.

O BrasilKit resolve isso uma vez sÃ³, com uma API consistente: todo recurso tem os mesmos erros tipados e a mesma polÃ­tica de resiliÃªncia.

- **Zero dependÃªncias de runtime** â€” sÃ³ `fetch` + `AbortController`.
- Funciona em **Node 20+, Deno, Bun e browsers** modernos (todos verificados na CI). Para desenvolver (rodar os testes), use Node 22+.
- **Tree-shakeable**: importe sÃ³ o recurso que usar (`brasil-kit/cep`).
- **Erros tipados** com `instanceof` funcionando.
- Campo **`fonte`** em toda resposta: vocÃª sabe qual provider respondeu.

## InstalaÃ§Ã£o

```bash
npm install brasil-kit
```

## Uso

```ts
import { createBrasilClient, NotFoundError } from 'brasil-kit';

const brasil = createBrasilClient({ cache: 'memory', timeout: 5000 });

const endereco = await brasil.cep.get('01001-000');      // tipado, com fallback
// { cep: '01001000', logradouro: 'PraÃ§a da SÃ©', cidade: 'SÃ£o Paulo', uf: 'SP', fonte: 'viacep', ... }

const municipios = await brasil.ibge.municipiosPorUf('SP');

try {
  await brasil.cep.get('99999-999');
} catch (err) {
  if (err instanceof NotFoundError) { /* CEP inexistente */ }
}
```

## Recursos

| Recurso | MÃ©todos | Provider(s) |
|---------|---------|-------------|
| `cep` | `get(cep)`, `search({ uf, cidade, logradouro })` | ViaCEP â†’ BrasilAPI (fallback) |
| `cnpj` | `get(cnpj)` â€” dados cadastrais, sÃ³cios e CNAEs | BrasilAPI â†’ Minha Receita (fallback) |
| `ibge` | `estados()`, `municipiosPorUf(uf)`, `municipioPorCodigo(cod)` | IBGE |
| `bancos` | `list()`, `getByCode(code)` | BrasilAPI |
| `feriados` | `get(ano)` | BrasilAPI |
| `ddd` | `get(ddd)` | BrasilAPI |

Toda entrada Ã© validada **antes** de ir para a rede (CEP com 8 dÃ­gitos, CNPJ com dÃ­gitos verificadores, UF vÃ¡lida...) e gera `ValidationError` de forma sÃ­ncrona.

## ConfiguraÃ§Ã£o

```ts
createBrasilClient({
  timeout: 5000,          // ms por tentativa
  retries: 2,             // tentativas extras em erro transitÃ³rio
  cache: 'memory',        // 'memory' | 'none' | CacheAdapter
  cacheTtl: 3_600_000,    // ms
  fetch: customFetch,     // injetÃ¡vel (testes, proxies, runtimes antigos)
  interceptors: {         // ou um array de interceptors, chamados em ordem
    onRequest:  ({ url, provider, attempt }) => {},
    onResponse: ({ status, durationMs }) => {},
    onError:    ({ error }) => {},
  },
  cep: { providers: ['brasilapi', 'viacep'] },          // ordem do fallback
  cnpj: { providers: ['minhareceita', 'brasilapi'] },
});
```

A configuraÃ§Ã£o Ã© validada e congelada na criaÃ§Ã£o. NÃ£o hÃ¡ estado global: dois clientes com configs diferentes convivem no mesmo processo.

### Cache

```ts
import { createLocalStorageCache, type CacheAdapter } from 'brasil-kit';

createBrasilClient({ cache: createLocalStorageCache() });        // browser

const redisCache: CacheAdapter = {                                 // qualquer backend
  get: async (k) => JSON.parse((await redis.get(k)) ?? 'null') ?? undefined,
  set: async (k, v, ttl) => void (await redis.set(k, JSON.stringify(v), { PX: ttl })),
};
```

### Import granular (tree-shaking)

```ts
import { createCore } from 'brasil-kit/core';
import { createCep } from 'brasil-kit/cep';

const cep = createCep(createCore({ timeout: 3000 }));
```

## Como funciona

```
createBrasilClient(config)
   â””â”€â”€ resources/           cep, cnpj, ibge, bancos, feriados, ddd   â† valida a entrada e usa o cache
          â””â”€â”€ providers/    viacep, brasilapi, ibge                  â† converte para o tipo canÃ´nico
                 â””â”€â”€ core/  http, retry, fallback, cache, errors     â† timeout, backoff, interceptors
```

- **Recursos** sÃ£o objetos criados por *factory*, que recebem as dependÃªncias por parÃ¢metro. NÃ£o hÃ¡ singleton nem estado global.
- **Providers** fazem a normalizaÃ§Ã£o na borda: o consumidor nunca vÃª o formato bruto de nenhuma API, e o campo `fonte` diz quem respondeu.
- **Core** concentra a resiliÃªncia: cada tentativa tem timeout prÃ³prio; erros transitÃ³rios sÃ£o repetidos com backoff e, se persistirem, passam para o prÃ³ximo provider.

## Erros

| Classe | `code` | Quando |
|--------|--------|--------|
| `ValidationError` | `VALIDATION` | Entrada invÃ¡lida (lanÃ§ado antes da rede) |
| `NotFoundError` | `NOT_FOUND` | 404, ou ViaCEP `200 {erro:true}`, ou IBGE `200 []` |
| `RateLimitError` | `RATE_LIMIT` | HTTP 429 (`retryAfter` quando disponÃ­vel) |
| `TimeoutError` | `TIMEOUT` | Estourou o `timeout` (a requisiÃ§Ã£o Ã© abortada) |
| `ProviderError` | `PROVIDER` | Rede, 5xx, 4xx inesperado, resposta malformada |

Todas estendem `BrasilKitError` e carregam `provider`, `status` e `url` quando aplicÃ¡vel. Detalhes de retry e fallback em [docs/resiliencia.md](docs/resiliencia.md).

## Com SDK vs sem SDK

<table>
<tr><th>Sem SDK</th><th>Com BrasilKit</th></tr>
<tr><td>

```ts
const ctrl = new AbortController();
const t = setTimeout(() => ctrl.abort(), 5000);
let data;
try {
  const r = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, '')}/json/`, { signal: ctrl.signal });
  if (!r.ok) throw new Error('falhou');
  data = await r.json();
  if (data.erro) throw new Error('nÃ£o encontrado'); // 200 com erro!
} catch {
  // tenta a BrasilAPI? com qual formato de retorno?
  // retry? cache? tipagem?
} finally { clearTimeout(t); }
```

</td><td>

```ts
const endereco = await brasil.cep.get(cep);
```

ValidaÃ§Ã£o, timeout, retry com backoff, fallback, normalizaÃ§Ã£o, cache e erros tipados inclusos.

</td></tr>
</table>

## Runtimes suportados

| Runtime | Como Ã© verificado na CI |
|---------|-------------------------|
| Node 20 | smoke test do pacote compilado |
| Node 22 e 24 | suÃ­te completa + smoke test ESM/CJS |
| Deno 2 | smoke test do pacote compilado |
| Bun | smoke test do pacote compilado |
| Browsers | suÃ­te completa em ambiente jsdom |

## Desenvolvimento

Requer **Node 22+** (exigÃªncia do Vitest 5 e do jsdom). Para usar a biblioteca, basta Node 20+.

```bash
git clone https://github.com/MaatheusPolli/brasil-kit.git
cd brasil-kit
npm install
```

```bash
npm test               # Vitest (Node)
npm run test:jsdom     # mesma suÃ­te em ambiente de browser
npm run coverage       # exige â‰¥ 90%
npm run examples       # exemplos executÃ¡veis (offline com fixtures)
npm run build          # tsup: ESM + CJS + d.ts, mÃºltiplos entry points
npm run smoke          # smoke test do dist/ (tambÃ©m roda em Deno e Bun na CI)
npm run docs           # TypeDoc em docs/typedoc
```

Nenhum teste da suÃ­te principal faz chamada real de rede: o `fetch` Ã© injetado e as respostas vÃªm de fixtures em `tests/fixtures`.

### Testes com as APIs reais

Separados da suÃ­te principal, para que instabilidade externa nÃ£o quebre o desenvolvimento:

```bash
npm run test:live                                  # direto
docker build -t brasil-kit . && docker run --rm brasil-kit   # em container
```

Na nuvem, o workflow **APIs reais** roda toda segunda-feira, em PRs que mexem nos providers e sob demanda (Actions â†’ APIs reais â†’ Run workflow).

## Estrutura do projeto

```
src/
â”œâ”€â”€ index.ts            createBrasilClient + exports pÃºblicos
â”œâ”€â”€ client.ts  config.ts
â”œâ”€â”€ core/               http, retry, fallback, cache, errors, validate
â”œâ”€â”€ providers/          viacep, brasilapi, ibge (client + mapper + types)
â”œâ”€â”€ resources/          cep, cnpj, ibge, bancos, feriados, ddd
â””â”€â”€ domain/             tipos canÃ´nicos (Endereco, Empresa, Municipio, UF...)
tests/                  unit, mappers, resources + fixtures
examples/               exemplos executÃ¡veis (rodam na CI em modo offline)
docs/                   api.md, resiliencia.md
```

## Contribuindo

1. Abra uma issue descrevendo o problema ou a API que quer adicionar.
2. Crie uma branch, implemente e rode `npm run typecheck && npm run coverage && npm run test:jsdom`.
3. Registre a mudanÃ§a com `npm run changeset`.
4. Abra um pull request.

## LicenÃ§a

DistribuÃ­do sob a licenÃ§a [MIT](LICENSE). Â© 2026 Matheus Gasparotto Polli.

Os dados vÃªm de serviÃ§os pÃºblicos de terceiros ([ViaCEP](https://viacep.com.br), [BrasilAPI](https://brasilapi.com.br) e [IBGE](https://servicodados.ibge.gov.br/api/docs)), sujeitos aos termos de uso de cada um.


## Licença

### Uso Pessoal
Este projeto é licenciado sob a **Licença MIT** para uso pessoal, educacional e não comercial.

### Uso Comercial
Se você deseja usar este projeto comercialmente, deve obter uma licença comercial do autor.

**Uso comercial inclui:**
- Incorporar em um produto comercial
- Oferecer como serviço
- Usar em atividades com fins lucrativos
- Implantação empresarial

**Para obter uma licença comercial:**
Email: ma.polli@hotmail.com
