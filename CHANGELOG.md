# brasil-sdk

## 0.3.0

### Minor Changes

- 546969a: Cancelamento por chamada: todo método dos resources aceita `{ signal }` (`AbortSignal`) e falha com
  o novo `CanceledError` (código `CANCELED`), sem retry nem fallback. Chamadas com `signal` não
  compartilham a requisição em voo, para que um cancelamento não derrube quem espera a mesma chave.
- 4b70efb: Suporte ao CNPJ alfanumérico da Receita Federal (12 caracteres `A-Z0-9` + 2 dígitos verificadores),
  com DV pelo módulo 11 sobre o valor ASCII menos 48; o mapper deixa de descartar as letras do CNPJ
  retornado pelos providers. Requisições simultâneas da mesma chave de cache agora são agrupadas em
  uma única chamada de rede.

## 0.2.1

### Patch Changes

- 633a72b: Teste do fluxo de release automático (changesets + trusted publishing).

## 0.2.0

### Minor Changes

- 78c1441: - CNPJ: fallback para a Minha Receita quando a BrasilAPI retorna HTTP 403.
  - Testes live (`npm run test:live`) e Dockerfile para execução isolada.
  - Exemplo `npm run examples` agora roda em Windows, Linux e macOS.

## 0.1.0

### Minor Changes

- Primeira versão: recursos `cep`, `cnpj`, `ibge`, `bancos`, `feriados` e `ddd`; erros tipados; cache plugável (memória, localStorage, custom); retry com backoff exponencial + jitter; fallback ViaCEP ↔ BrasilAPI; interceptors; build multi-entry tree-shakeable.
