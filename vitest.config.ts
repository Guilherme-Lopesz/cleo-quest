import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': r('./src'),
      '@core': r('./src/features/game-core'),
      '@engine': r('./src/features/game-engine'),
      '@minigames': r('./src/features/minigames'),
      '@infra': r('./src/infrastructure'),
      '@shared': r('./src/shared'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/features/**', 'src/infrastructure/**', 'src/shared/**'],
      exclude: ['**/*.d.ts', '**/index.ts'],
    },
  },
});
