---
'brasil-sdk': minor
---

Suporte ao CNPJ alfanumérico da Receita Federal (12 caracteres `A-Z0-9` + 2 dígitos verificadores),
com DV pelo módulo 11 sobre o valor ASCII menos 48; o mapper deixa de descartar as letras do CNPJ
retornado pelos providers. Requisições simultâneas da mesma chave de cache agora são agrupadas em
uma única chamada de rede.
