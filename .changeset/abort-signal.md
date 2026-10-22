---
'brasil-sdk': minor
---

Cancelamento por chamada: todo método dos resources aceita `{ signal }` (`AbortSignal`) e falha com
o novo `CanceledError` (código `CANCELED`), sem retry nem fallback. Chamadas com `signal` não
compartilham a requisição em voo, para que um cancelamento não derrube quem espera a mesma chave.
