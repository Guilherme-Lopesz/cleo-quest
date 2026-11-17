import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * Regras de fronteira arquitetural (SAD §3.3).
 * Cada bloco restringe o que um módulo PODE importar. Violar a fronteira
 * falha o lint e, portanto, o CI.
 */
const forbid = (patterns) => ({
  'no-restricted-imports': ['error', { patterns }],
});

export default defineConfig(
  {
    ignores: [
      'dist/**',
      '.astro/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'public/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...astro.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: true },
      ],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      eqeqeq: ['error', 'always'],
    },
  },
  // Domínio: não conhece framework visual, engine, banco nem infraestrutura.
  {
    files: ['src/features/game-core/domain/**/*.ts', 'src/features/game-core/contracts/**/*.ts'],
    rules: forbid([
      { group: ['astro', 'astro:*'], message: 'Domínio não importa Astro.' },
      { group: ['phaser'], message: 'Domínio não importa Phaser.' },
      { group: ['dexie'], message: 'Domínio não importa Dexie.' },
      {
        group: ['@infra/*', '**/infrastructure/*'],
        message: 'Domínio depende de interfaces, não de infraestrutura.',
      },
      { group: ['@/components/*', '**/components/*'], message: 'Domínio não importa componentes.' },
    ]),
  },
  // Aplicação: orquestra domínio e repositórios por interface; nunca Phaser ou UI.
  {
    files: ['src/features/game-core/application/**/*.ts'],
    rules: forbid([
      { group: ['phaser'], message: 'Game Core não conhece detalhes do Phaser.' },
      { group: ['astro', 'astro:*'], message: 'Aplicação não importa Astro.' },
      {
        group: ['@/components/*', '**/components/*'],
        message: 'Aplicação não importa componentes.',
      },
    ]),
  },
  // Minigames: só contratos e utilidades da engine. Nada de banco, saldo ou repositórios.
  {
    files: ['src/features/minigames/**/*.ts'],
    rules: forbid([
      { group: ['dexie'], message: 'Minigames não acessam IndexedDB.' },
      {
        group: ['@infra/*', '**/infrastructure/*'],
        message: 'Minigames não importam repositórios.',
      },
      {
        group: [
          '@core/domain/*',
          '**/game-core/domain/*',
          '@core/application/*',
          '**/game-core/application/*',
        ],
        message: 'Minigames falam com o Core apenas pelo GameContext (contratos).',
      },
    ]),
  },
  // Game Engine: adapta engine → contratos. Não grava dados nem debita moedas.
  {
    files: ['src/features/game-engine/**/*.ts'],
    rules: forbid([
      { group: ['dexie'], message: 'Game Engine não acessa IndexedDB.' },
      {
        group: ['@infra/persistence/*', '**/infrastructure/persistence/*'],
        message: 'Game Engine não grava dados.',
      },
    ]),
  },
  // Interface: não toca o banco diretamente.
  {
    files: ['src/components/**/*.ts', 'src/pages/**/*.ts', 'src/layouts/**/*.ts'],
    rules: forbid([
      { group: ['dexie'], message: 'UI não acessa IndexedDB diretamente.' },
      {
        group: ['@infra/persistence/*', '**/infrastructure/persistence/*'],
        message: 'UI usa casos de uso, não repositórios.',
      },
    ]),
  },
  {
    files: ['**/*.astro'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.astro'] },
    },
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  {
    // Módulos virtuais do Astro (astro:content) não existem no programa TS do ESLint;
    // o `astro check`/tsc validam esse arquivo com os tipos gerados em .astro/.
    files: ['src/features/content/**/*.ts'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: { ...globals.node },
    },
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['scripts/**/*.{ts,mts,mjs}', 'tests/**/*.ts', '*.config.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ['tests/**/*.ts', 'scripts/**/*.{ts,mts}'],
    rules: { 'no-console': 'off', '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  prettier,
);
