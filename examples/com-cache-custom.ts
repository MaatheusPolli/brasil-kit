/** Cache plugável: qualquer objeto com get/set (Redis, KV, IndexedDB...). */
import { createCore, type CacheAdapter } from '../src/index.js';
import { createCep } from '../src/resources/cep.js';
import { fetchParaExemplo } from './_offline.js';

const store = new Map<string, { value: unknown; expiresAt: number }>();
let hits = 0;

const cacheLogado: CacheAdapter = {
  async get(key) {
    const entry = store.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      hits++;
      return entry.value as never;
    }
    return undefined;
  },
  async set(key, value, ttlMs) {
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
  },
};

// Import granular: só o resource de CEP entra no bundle.
const cep = createCep(createCore({ cache: cacheLogado, cacheTtl: 10 * 60_000, fetch: fetchParaExemplo }));

await cep.get('01001000');
await cep.get('01001-000');
console.log(`chaves em cache: ${[...store.keys()].join(', ')} · hits: ${hits}`);
if (hits !== 1) throw new Error('esperava 1 hit de cache');
