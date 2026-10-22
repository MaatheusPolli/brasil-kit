# brasil-sdk

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
