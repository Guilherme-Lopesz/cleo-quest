import { test, expect } from '@playwright/test';

test('home abre e não carrega Phaser', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (req) => {
    if (req.resourceType() === 'script') scripts.push(req.url());
  });
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cleo');
  expect(scripts.some((u) => /phaser/i.test(u))).toBe(false);
});

test('contador de dias de vida aparece com a data configurada', async ({ page }) => {
  await page.goto('./');
  const days = Number((await page.locator('[data-days]').innerText()).replace(/\D/g, ''));
  const expected = Math.floor(
    (Date.now() - new Date('2026-03-05T00:00:00').getTime()) / 86_400_000,
  );
  expect(Math.abs(days - expected)).toBeLessThanOrEqual(1);
});
