import { test, expect } from '@playwright/test';

test.describe('Memória Felina (DOM)', () => {
  test('não carrega Phaser, encontra todos os pares e recebe recompensa', async ({ page }) => {
    const scripts: string[] = [];
    page.on('request', (r) => {
      if (r.resourceType() === 'script') scripts.push(r.url());
    });
    await page.goto('./parque/cat-memory/');
    await page.getByRole('button', { name: 'Começar' }).click();
    const cards = page.locator('.memory__card');
    await expect(cards).toHaveCount(12);
    expect(scripts.some((u) => /phaser/i.test(u))).toBe(false);

    // estratégia: lê as imagens de cada carta e vira os pares certos
    const srcs = await cards.evaluateAll((els) =>
      els.map((e) => e.querySelector('img')?.getAttribute('src') ?? ''),
    );
    const seen = new Map<string, number>();
    const pairs: [number, number][] = [];
    srcs.forEach((s, i) => {
      if (seen.has(s)) pairs.push([seen.get(s)!, i]);
      else seen.set(s, i);
    });
    expect(pairs).toHaveLength(6);
    await page.waitForTimeout(2200); // partidas abaixo de 2s são implausíveis e não recebem recompensa (D-008)
    for (const [a, b] of pairs) {
      await cards.nth(a).click();
      await cards.nth(b).click();
      await expect(cards.nth(b)).toHaveClass(/is-matched/);
    }
    await expect(page.locator('.game-result')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.game-overlay__panel')).toContainText('Vitória');
    const reward = Number(
      (await page.locator('.game-result dd.coin').first().innerText()).replace(/\D/g, ''),
    );
    expect(reward).toBe(35); // 300 pontos → participação 15 + 30 + bônus 10 = 55 → teto 35
    await expect(page.locator('#game-hearts')).toContainText('5 de 5');
  });
});

test.describe('Pescaria (Phaser)', () => {
  test('carrega Phaser ao começar, puxar cedo custa coração e a partida chega ao fim', async ({
    page,
  }) => {
    test.slow();
    const scripts: string[] = [];
    page.on('request', (r) => {
      if (r.resourceType() === 'script') scripts.push(r.url());
    });
    await page.goto('./parque/fishing/');
    expect(scripts.some((u) => /phaser/i.test(u))).toBe(false);
    await page.getByRole('button', { name: 'Começar' }).click();
    await page.waitForSelector('#game-stage canvas', { timeout: 20_000 });
    expect(scripts.some((u) => /phaser/i.test(u))).toBe(true);
    const canvas = page.locator('#game-stage canvas');
    // lança e puxa imediatamente (cedo demais) → perde um coração
    await canvas.click();
    await page.waitForTimeout(300);
    await canvas.click();
    await expect(page.locator('#game-hearts')).toContainText('4 de 5', { timeout: 5000 });
    // continua jogando com toques espaçados até o fim (10 lançamentos ou corações)
    const start = Date.now();
    while (Date.now() - start < 90_000) {
      if ((await page.locator('#game-root').getAttribute('data-phase')) === 'result') break;
      await canvas.click();
      await page.waitForTimeout(900);
    }
    await expect(page.locator('.game-result')).toBeVisible({ timeout: 20_000 });
  });
});
