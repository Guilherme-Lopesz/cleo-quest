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
