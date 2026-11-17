import { test, expect } from '@playwright/test';

test('Hora da Soneca e som persistem após recarregar', async ({ page }) => {
  await page.goto('./');
  await page.locator('#toggle-theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'soneca');
  await page.locator('#toggle-sound').click();
  await expect(page.locator('#toggle-sound')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'soneca');
  await expect(page.locator('#toggle-sound')).toHaveAttribute('aria-pressed', 'true');
});

test('a Cleo caminhante existe e reage ao toque', async ({ page }) => {
  await page.goto('./');
  const hit = page.locator('.cleo-walker__hit');
  await expect(hit).toBeVisible();
  await hit.click();
  await expect(page.locator('.cleo-walker__bubble')).toBeVisible();
});
