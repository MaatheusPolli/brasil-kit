import { createCore, type BrasilClientConfig } from './config.js';
import type { CoreContext } from './core/context.js';
import { createCep, type CepResource, type CepResourceOptions } from './resources/cep.js';
import { createCnpj, type CnpjResource, type CnpjResourceOptions } from './resources/cnpj.js';
import { createIbge, type IbgeResource } from './resources/ibge.js';
import { createBancos, type BancosResource } from './resources/bancos.js';
import { createFeriados, type FeriadosResource } from './resources/feriados.js';
import { createDdd, type DddResource } from './resources/ddd.js';

export interface BrasilClientOptions extends BrasilClientConfig {
  readonly cep?: CepResourceOptions;
  readonly cnpj?: CnpjResourceOptions;
}

export interface BrasilClient {
  readonly cep: CepResource;
  readonly cnpj: CnpjResource;
  readonly ibge: IbgeResource;
  readonly bancos: BancosResource;
  readonly feriados: FeriadosResource;
  readonly ddd: DddResource;
  /** Limpa o cache configurado (se suportado pelo adapter). */
  clearCache(): Promise<void>;
}

/** Cria um cliente independente. Dois clientes nunca compartilham estado. */
export function createBrasilClient(options: BrasilClientOptions = {}): BrasilClient {
  const ctx: CoreContext = createCore(options);
  return Object.freeze({
    cep: createCep(ctx, options.cep),
    cnpj: createCnpj(ctx, options.cnpj),
    ibge: createIbge(ctx),
    bancos: createBancos(ctx),
    feriados: createFeriados(ctx),
    ddd: createDdd(ctx),
    async clearCache() {
      await ctx.cache?.clear?.();
    },
  });
}
