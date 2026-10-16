import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    core: 'src/core/index.ts',
    cep: 'src/resources/cep.ts',
    cnpj: 'src/resources/cnpj.ts',
    ibge: 'src/resources/ibge.ts',
    bancos: 'src/resources/bancos.ts',
    feriados: 'src/resources/feriados.ts',
    ddd: 'src/resources/ddd.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  treeshake: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
});
