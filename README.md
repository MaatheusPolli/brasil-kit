# BrasilKit

> SDK TypeScript para APIs públicas brasileiras (ViaCEP, BrasilAPI, IBGE), com tipos completos, cache, retry, fallback entre provedores e suporte a Node e browser.

[![CI](https://github.com/MaatheusPolli/brasil-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/MaatheusPolli/brasil-kit/actions/workflows/ci.yml)
[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue.svg)](LICENSE)

## Por que existe

Consumir o ViaCEP ou o IBGE é fácil; consumir **bem** não é. Cada projeto acaba reimplementando as mesmas coisas:

- a tipagem do retorno de cada API;
- o "CEP não encontrado" do ViaCEP, que chega como **HTTP 200** com `{ "erro": true }`;
- timeout, retry e cache;
- um plano B quando o serviço cai.

O BrasilKit resolve isso uma vez só, com uma API consistente: todo recurso tem os mesmos erros tipados e a mesma política de resiliência.

- **Zero dependências de runtime** — só `fetch` + `AbortController`.
- Funciona em **Node 20+, Deno, Bun e browsers** modernos (todos verificados na CI). Para desenvolver (rodar os testes), use Node 22+.
- **Tree-shakeable**: importe só o recurso que usar (`brasil-kit/cep`).
- **Erros tipados** com `instanceof` funcionando.
- Campo **`fonte`** em toda resposta: você sabe qual provider respondeu.

## Instalação

```bash
npm install brasil-kit
```

## Uso

```ts
import { createBrasilClient, NotFoundError } from 'brasil-kit';

const brasil = createBrasilClient({ cache: 'memory', timeout: 5000 });

const endereco = await brasil.cep.get('01001-000');      // tipado, com fallback
// { cep: '01001000', logradouro: 'Praça da Sé', cidade: 'São Paulo', uf: 'SP', fonte: 'viacep', ... }

const municipios = await brasil.ibge.municipiosPorUf('SP');

try {
  await brasil.cep.get('99999-999');
} catch (err) {
  if (err instanceof NotFoundError) { /* CEP inexistente */ }
}
```

## Recursos

| Recurso | Métodos | Provider(s) |
|---------|---------|-------------|
| `cep` | `get(cep)`, `search({ uf, cidade, logradouro })` | ViaCEP → BrasilAPI (fallback) |
| `cnpj` | `get(cnpj)` — dados cadastrais, sócios e CNAEs | BrasilAPI → Minha Receita (fallback) |
| `ibge` | `estados()`, `municipiosPorUf(uf)`, `municipioPorCodigo(cod)` | IBGE |
| `bancos` | `list()`, `getByCode(code)` | BrasilAPI |
| `feriados` | `get(ano)` | BrasilAPI |
| `ddd` | `get(ddd)` | BrasilAPI |

Toda entrada é validada **antes** de ir para a rede (CEP com 8 dígitos, CNPJ com dígitos verificadores, UF válida...) e gera `ValidationError` de forma síncrona.

## Configuração

```ts
createBrasilClient({
  timeout: 5000,          // ms por tentativa
  retries: 2,             // tentativas extras em erro transitório
  cache: 'memory',        // 'memory' | 'none' | CacheAdapter
  cacheTtl: 3_600_000,    // ms
  fetch: customFetch,     // injetável (testes, proxies, runtimes antigos)
  interceptors: {         // ou um array de interceptors, chamados em ordem
    onRequest:  ({ url, provider, attempt }) => {},
    onResponse: ({ status, durationMs }) => {},
    onError:    ({ error }) => {},
  },
  cep: { providers: ['brasilapi', 'viacep'] },          // ordem do fallback
  cnpj: { providers: ['minhareceita', 'brasilapi'] },
});
```

A configuração é validada e congelada na criação. Não há estado global: dois clientes com configs diferentes convivem no mesmo processo.

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
   └── resources/           cep, cnpj, ibge, bancos, feriados, ddd   ← valida a entrada e usa o cache
          └── providers/    viacep, brasilapi, ibge                  ← converte para o tipo canônico
                 └── core/  http, retry, fallback, cache, errors     ← timeout, backoff, interceptors
```

- **Recursos** são objetos criados por *factory*, que recebem as dependências por parâmetro. Não há singleton nem estado global.
- **Providers** fazem a normalização na borda: o consumidor nunca vê o formato bruto de nenhuma API, e o campo `fonte` diz quem respondeu.
- **Core** concentra a resiliência: cada tentativa tem timeout próprio; erros transitórios são repetidos com backoff e, se persistirem, passam para o próximo provider.

## Erros

| Classe | `code` | Quando |
|--------|--------|--------|
| `ValidationError` | `VALIDATION` | Entrada inválida (lançado antes da rede) |
| `NotFoundError` | `NOT_FOUND` | 404, ou ViaCEP `200 {erro:true}`, ou IBGE `200 []` |
| `RateLimitError` | `RATE_LIMIT` | HTTP 429 (`retryAfter` quando disponível) |
| `TimeoutError` | `TIMEOUT` | Estourou o `timeout` (a requisição é abortada) |
| `ProviderError` | `PROVIDER` | Rede, 5xx, 4xx inesperado, resposta malformada |

Todas estendem `BrasilKitError` e carregam `provider`, `status` e `url` quando aplicável. Detalhes de retry e fallback em [docs/resiliencia.md](docs/resiliencia.md).

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
  if (data.erro) throw new Error('não encontrado'); // 200 com erro!
} catch {
  // tenta a BrasilAPI? com qual formato de retorno?
  // retry? cache? tipagem?
} finally { clearTimeout(t); }
```

</td><td>

```ts
const endereco = await brasil.cep.get(cep);
```

Validação, timeout, retry com backoff, fallback, normalização, cache e erros tipados inclusos.

</td></tr>
</table>

## Runtimes suportados

| Runtime | Como é verificado na CI |
|---------|-------------------------|
| Node 20 | smoke test do pacote compilado |
| Node 22 e 24 | suíte completa + smoke test ESM/CJS |
| Deno 2 | smoke test do pacote compilado |
| Bun | smoke test do pacote compilado |
| Browsers | suíte completa em ambiente jsdom |

## Desenvolvimento

Requer **Node 22+** (exigência do Vitest 5 e do jsdom). Para usar a biblioteca, basta Node 20+.

```bash
git clone https://github.com/MaatheusPolli/brasil-kit.git
cd brasil-kit
npm install
```

```bash
npm test               # Vitest (Node)
npm run test:jsdom     # mesma suíte em ambiente de browser
npm run coverage       # exige ≥ 90%
npm run examples       # exemplos executáveis (offline com fixtures)
npm run build          # tsup: ESM + CJS + d.ts, múltiplos entry points
npm run smoke          # smoke test do dist/ (também roda em Deno e Bun na CI)
npm run docs           # TypeDoc em docs/typedoc
```

Nenhum teste da suíte principal faz chamada real de rede: o `fetch` é injetado e as respostas vêm de fixtures em `tests/fixtures`.

### Testes com as APIs reais

Separados da suíte principal, para que instabilidade externa não quebre o desenvolvimento:

```bash
npm run test:live                                  # direto
docker build -t brasil-kit . && docker run --rm brasil-kit   # em container
```

Na nuvem, o workflow **APIs reais** roda toda segunda-feira, em PRs que mexem nos providers e sob demanda (Actions → APIs reais → Run workflow).

## Estrutura do projeto

```
src/
├── index.ts            createBrasilClient + exports públicos
├── client.ts  config.ts
├── core/               http, retry, fallback, cache, errors, validate
├── providers/          viacep, brasilapi, ibge (client + mapper + types)
├── resources/          cep, cnpj, ibge, bancos, feriados, ddd
└── domain/             tipos canônicos (Endereco, Empresa, Municipio, UF...)
tests/                  unit, mappers, resources + fixtures
examples/               exemplos executáveis (rodam na CI em modo offline)
docs/                   api.md, resiliencia.md
```

## Contribuindo

1. Abra uma issue descrevendo o problema ou a API que quer adicionar.
2. Crie uma branch, implemente e rode `npm run typecheck && npm run coverage && npm run test:jsdom`.
3. Registre a mudança com `npm run changeset`.
4. Abra um pull request.

## Licença

Distribuído sob a licença [MIT](LICENSE). © 2026 Matheus Gasparotto Polli.

Os dados vêm de serviços públicos de terceiros ([ViaCEP](https://viacep.com.br), [BrasilAPI](https://brasilapi.com.br) e [IBGE](https://servicodados.ibge.gov.br/api/docs)), sujeitos aos termos de uso de cada um.
