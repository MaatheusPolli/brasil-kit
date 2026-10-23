---
'brasil-sdk': patch
---

Ajustes internos apontados pelo ESLint: os providers do fallback de CEP/CNPJ passam a ser
chamados por closures (em vez de métodos desacoplados do objeto), `uf` aceita `UF | (string & {})`
para manter o autocomplete das UFs, e a resolução de interceptors ficou com tipos estreitos.
Sem mudança de comportamento.
