import { test, expect } from '@playwright/test';

test.describe('Pegue o Novelo', () => {
  test('carrega Phaser só ao começar, joga uma partida completa e a recompensa persiste', async ({
    page,
  }) => {
    test.slow();
    const scripts: string[] = [];
    page.on('request', (r) => {
      if (r.resourceType() === 'script') scripts.push(r.url());
    });
    await page.goto('./parque/yarn-catcher/');
    await expect(page.getByRole('button', { name: 'Começar' })).toBeVisible();
    expect(scripts.some((u) => /phaser/i.test(u))).toBe(false);

    await page.getByRole('button', { name: 'Começar' }).click();
    await page.waitForSelector('#game-stage canvas', { timeout: 20_000 });
    expect(scripts.some((u) => /phaser/i.test(u))).toBe(true);
    await expect(page.locator('#game-hearts')).toContainText('5 de 5');

    // pausa e retomada
    await page.locator('#game-pause').click();
    await expect(page.locator('#game-root')).toHaveAttribute('data-phase', 'paused');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.locator('#game-root')).toHaveAttribute('data-phase', 'playing');

    const box = (await page.locator('#game-stage canvas').boundingBox())!;
    const start = Date.now();
    while (Date.now() - start < 70_000) {
      await page.mouse.click(box.x + box.width * Math.random(), box.y + box.height * 0.5);
      await page.waitForTimeout(500);
      if ((await page.locator('#game-root').getAttribute('data-phase')) === 'result') break;
    }
    await expect(page.locator('.game-result')).toBeVisible({ timeout: 20_000 });
    const rewardText = await page.locator('.game-result dd.coin').first().innerText();
    const reward = Number(rewardText.replace(/\D/g, ''));
    expect(reward).toBeGreaterThanOrEqual(5);
    expect(reward).toBeLessThanOrEqual(30);

    const balanceBefore = Number(await page.locator('[data-wallet-balance]').textContent());
    await page.reload();
    await expect(page.locator('[data-wallet-balance]')).not.toHaveText('—');
    const balanceAfter = Number(await page.locator('[data-wallet-balance]').textContent());
    expect(balanceAfter).toBeGreaterThanOrEqual(balanceBefore);
    expect(balanceAfter).toBeGreaterThanOrEqual(50 + reward);
  });
});
