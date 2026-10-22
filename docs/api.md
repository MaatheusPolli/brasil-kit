# API

A referência completa é gerada pelo TypeDoc (`npm run docs` → `docs/typedoc`). Este é o resumo.

## `createBrasilClient(options?)`

Retorna um `BrasilClient` congelado com os recursos abaixo e `clearCache()`.

## `cep`

| Método | Retorno | Erros |
|--------|---------|-------|
| `get(cep: string)` | `Endereco` | `ValidationError`, `NotFoundError`, `TimeoutError`, `ProviderError` |
| `search({ uf, cidade, logradouro })` | `Endereco[]` (vazio se nada encontrado) | `ValidationError` (cidade/logradouro < 3 caracteres, UF inválida) |

```ts
interface Endereco {
  cep: string;              // só dígitos
  logradouro: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: UF;
  codigoIbge?: string;      // ViaCEP
  ddd?: string;             // ViaCEP
  coordenadas?: { latitude: number; longitude: number }; // BrasilAPI, quando disponível
  fonte: 'viacep' | 'brasilapi';
}
```

## `cnpj`

`get(cnpj)` → `Empresa` com `razaoSocial`, `nomeFantasia`, `situacao`, `cnaePrincipal`, `cnaesSecundarios`, `endereco`, `socios` e mais. Aceita com ou sem máscara; os dígitos verificadores são validados localmente.

## `ibge`

- `estados()` → `Estado[]` (`id`, `sigla`, `nome`, `regiao`), ordenados por nome.
- `municipiosPorUf(uf)` → `Municipio[]`.
- `municipioPorCodigo(codigo)` → `Municipio` (código de 7 dígitos).

## `bancos`

- `list()` → `Banco[]` (`codigo` pode ser `null` para instituições sem código COMPE).
- `getByCode(code)` → `Banco` (aceita `1` ou `"001"`).

## `feriados`

`get(ano)` → `Feriado[]` (`data` ISO, `nome`, `tipo`). Ano entre 1900 e 2199.

## `ddd`

`get(ddd)` → `Ddd` (`uf`, `cidades` em ordem alfabética). DDD entre 11 e 99.

## Core (`brasil-sdk/core`)

`createCore`, `createHttp`, `withRetry`, `backoffDelay`, `fallback`, `cached`, `createMemoryCache`, `createLocalStorageCache`, erros e tipos de domínio — para montar clientes sob medida.
