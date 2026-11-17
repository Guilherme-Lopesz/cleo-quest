import { defineConfig, devices } from '@playwright/test';

const BASE_PATH = process.env.BASE_PATH ?? '/cleo-quest/';
const PORT = 4321;
/**
 * Em ambientes sem acesso ao CDN do Playwright (como este workspace), use um
 * Chrome do sistema: `PW_CHANNEL=chrome pnpm test:e2e`. No CI o Chromium
 * gerenciado pelo Playwright é instalado normalmente.
 */
const channel = process.env.PW_CHANNEL;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${PORT}${BASE_PATH}`,
    trace: 'on-first-retry',
    ...(channel ? { channel } : {}),
    screenshot: 'only-on-failure',
  },
  // E2E roda contra o build de produção servido sob o mesmo `base` do GitHub Pages.
  webServer: {
    command: `node scripts/serve-dist.mjs`,
    url: `http://localhost:${PORT}${BASE_PATH}`,
    env: { PORT: String(PORT), BASE_PATH },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
});
