import { test, expect } from '@playwright/test';

test('som desligado por padrão: nenhuma gravação é baixada, mesmo após interagir', async ({
  page,
}) => {
  const audioReqs: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/audio/')) audioReqs.push(r.url());
  });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-cleo-ready', 'true');
  await page.locator('.cleo-walker__hit').click();
  await page.waitForTimeout(800);
  expect(audioReqs).toEqual([]);
});

test('ao ligar o som, as gravações da Cleo carregam do subpath sem erro', async ({ page }) => {
  const responses: { url: string; status: number }[] = [];
  page.on('response', (r) => {
    if (r.url().includes('/audio/cleo/')) responses.push({ url: r.url(), status: r.status() });
  });
  await page.goto('./');
  await page.locator('#toggle-sound').click(); // gesto + liga o som
  await expect.poll(() => responses.length, { timeout: 5000 }).toBeGreaterThanOrEqual(6);
  expect(
    responses.every((r) => r.status === 200 && r.url.includes('/cleo-quest/audio/cleo/')),
  ).toBe(true);
});
