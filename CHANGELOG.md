# brasil-kit

## Não lançado

- `cnpj.get` com fallback BrasilAPI → Minha Receita (`cnpj.providers` configurável; `fonte: 'minhareceita'`).
- HTTP 403 passa a acionar fallback (sem retry).
- Testes de integração com as APIs reais (`npm run test:live`), workflow "APIs reais" e Dockerfile.

## 0.1.0

### Minor Changes

- Primeira versão: recursos `cep`, `cnpj`, `ibge`, `bancos`, `feriados` e `ddd`; erros tipados; cache plugável (memória, localStorage, custom); retry com backoff exponencial + jitter; fallback ViaCEP ↔ BrasilAPI; interceptors; build multi-entry tree-shakeable.
