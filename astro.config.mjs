// @ts-check
import { defineConfig } from 'astro/config';

/**
 * GitHub Pages publica em https://<usuario>.github.io/<repo>/.
 * `site` e `base` podem ser sobrescritos por variáveis de ambiente no CI
 * para que o mesmo código funcione em forks ou domínio próprio.
 */
const site = process.env.SITE_URL ?? 'https://guilherme-lopesz.github.io';
const base = process.env.BASE_PATH ?? '/cleo-quest/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  output: 'static',
  build: {
    assets: '_assets',
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          // Phaser fica em chunk próprio: só é baixado quando um jogo é aberto.
          manualChunks(id) {
            if (id.includes('node_modules/phaser')) return 'phaser';
            if (id.includes('node_modules/dexie')) return 'dexie';
            return undefined;
          },
        },
      },
    },
  },
});
