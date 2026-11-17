import { test, expect } from '@playwright/test';

test.describe('conquistas e easter eggs', () => {
  test('carinho na Cleo desbloqueia a primeira conquista uma única vez', async ({ page }) => {
    await page.goto('./');
    await page.waitForFunction(
      () => document.querySelector('[data-wallet-balance]')?.textContent !== '—',
    );
    await page.locator('.cleo-walker__hit').click();
    await expect(page.locator('.toast--success')).toContainText('Primeiro carinho');
    await expect(page.locator('[data-wallet-balance]')).toHaveText('70');
    await page.locator('.cleo-walker__hit').click();
    await page.waitForTimeout(400);
    await expect(page.locator('[data-wallet-balance]')).toHaveText('70');
    await page.goto('./conquistas/');
    await expect(page.locator('[data-achievement-id="primeiro-carinho"]')).toHaveAttribute(
      'data-state',
      'unlocked',
    );
    await expect(page.locator('#ach-summary')).toContainText('1 de 8');
  });

  test('Konami Code é um segredo pago uma vez; capítulos pagam exploração', async ({ page }) => {
    await page.goto('./historia/');
    await page.waitForFunction(
      () => document.querySelector('[data-wallet-balance]')?.textContent !== '—',
    );
    for (const k of [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'b',
      'a',
    ]) {
      await page.keyboard.press(k);
    }
    await expect(page.locator('.toast--success').filter({ hasText: 'segredo' })).toBeVisible();
    await page.waitForTimeout(1800); // primeiro capítulo visível por 1,5s
    await page.goto('./conquistas/');
    await expect(page.locator('[data-stat="eggs"]')).toHaveText('1/4');
    const balance = Number(await page.locator('[data-wallet-balance]').textContent());
    expect(balance).toBeGreaterThanOrEqual(80); // 50 + 20 (egg) + 10 (capítulo)
  });
});
