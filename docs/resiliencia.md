# Resiliência

Cada chamada passa por três camadas, de dentro para fora:

```
cache ──► fallback (entre providers) ──► retry (no mesmo provider) ──► http (timeout + interceptors)
```

## Timeout

Cada **tentativa** tem seu próprio `AbortController`. Ao estourar `timeout`, a requisição é abortada de verdade (a conexão é liberada) e vira `TimeoutError`. O timeout cobre também a leitura do corpo.

## Retry

Só erros **transitórios** são repetidos:

| Erro                                         | Retry?               | Fallback? |
| -------------------------------------------- | -------------------- | --------- |
| Falha de rede (`ProviderError` sem `status`) | ✅                   | ✅        |
| HTTP 5xx                                     | ✅                   | ✅        |
| `TimeoutError`                               | ✅                   | ✅        |
| `RateLimitError` (429)                       | ✅                   | ✅        |
| Resposta malformada do provider              | ✅                   | ✅        |
| HTTP 404 / `NotFoundError`                   | ❌                   | ❌        |
| HTTP 403 (acesso negado pelo provider)       | ❌                   | ✅        |
| Outros 4xx (400, 401...)                     | ❌                   | ❌        |
| `ValidationError`                            | — (nem chega à rede) | —         |

O atraso entre tentativas usa backoff exponencial com _full jitter_:
`atraso = aleatório(0, min(maxDelay, baseDelay × 2^tentativa))`, com `baseDelay = 200ms` e `maxDelay = 5s` por padrão (ajustáveis em `retryOptions`). O jitter evita que muitos clientes repitam em sincronia contra um serviço já sobrecarregado.

## Fallback

Dois recursos têm mais de um provider: `cep` (ViaCEP → BrasilAPI) e `cnpj` (BrasilAPI → [Minha Receita](https://minhareceita.org)). A ordem é configurável em `cep.providers` e `cnpj.providers`. O fallback acontece **depois** que os retries do provider se esgotaram.

**Por que 404 não aciona fallback?** Se o CEP não existe na base dos Correios, perguntar a outro provider só adiciona latência — e em caso de divergência entre bases, preferimos uma resposta determinística. Um 4xx indica problema na requisição, que se repetiria em qualquer provider.

**Por que 429 aciona?** O limite é do provider, não da requisição: outro provider pode responder normalmente.

**Por que 403 aciona (mas sem retry)?** Acesso negado costuma ser bloqueio do provider — por exemplo, o endpoint de CNPJ da BrasilAPI recusa IPs de datacenter, como os do GitHub Actions. Repetir no mesmo provider não adianta; outro provider pode responder.

Quando todos falham, o erro lançado é o do **último** provider tentado.

## Casos especiais normalizados

- ViaCEP responde `200 { "erro": true }` (ou `"true"`) para CEP inexistente → `NotFoundError`.
- IBGE responde `200 []` para código de município inexistente → `NotFoundError`.
- IBGE devolve `microrregiao: null` em municípios recentes → a UF é obtida pela região imediata.

## Cache

Só respostas de sucesso são cacheadas; erros nunca. TTL padrão de 1 hora (24 horas para dados do IBGE). O cache é _best-effort_: um `localStorage` cheio não quebra a chamada.
