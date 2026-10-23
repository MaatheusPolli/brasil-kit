import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'docs/typedoc/'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // O SDK é publicado: a fronteira pública precisa de tipos explícitos.
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'error',
      // `!= null` cobre null e undefined de uma vez; é intencional nos mappers.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      // `string & {}` mantém o autocomplete de UF sem travar a entrada em strings literais.
      '@typescript-eslint/no-empty-object-type': ['error', { allowObjectTypes: 'always' }],
    },
  },
  {
    // Os providers expõem seus tipos por inferência (`ReturnType<typeof createX>`),
    // então escrever o retorno à mão só duplicaria a forma do objeto.
    files: ['src/providers/**/client.ts'],
    rules: { '@typescript-eslint/explicit-module-boundary-types': 'off' },
  },
  {
    // Testes e scripts não fazem parte da API pública e podem imprimir no console.
    // Também lidam de propósito com `any` de fixtures, promises soltas e throws não-Error.
    files: ['tests/**/*.ts', 'examples/**/*.ts', 'scripts/**/*.mjs', '*.config.ts', 'eslint.config.js'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs', 'eslint.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
);
