import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  '',
  'historia/',
  'galeria/',
  'parque/',
  'parque/yarn-catcher/',
  'loja/',
  'inventario/',
  'casinha/',
  'conquistas/',
];

for (const theme of ['light', 'soneca'] as const) {
  for (const path of PAGES) {
    test(`a11y (${theme}): /${path}`, async ({ page }) => {
      await page.addInitScript((t) => {
        localStorage.setItem('cleo-quest:preferences', JSON.stringify({ theme: t }));
      }, theme);
      await page.goto(`./${path}`);
      await page.waitForTimeout(400);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('#cleo-walker') // sprite decorativo animado; tem rótulo próprio, testado à parte
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(
        serious.map(
          (v) =>
            `${v.id}: ${v.nodes
              .map((n) => n.target.join(' '))
              .slice(0, 3)
              .join(' | ')}`,
        ),
      ).toEqual([]);
    });
  }
}

test('navegação por teclado: pular para o conteúdo e foco visível', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#conteudo')).toBeFocused();
});

test('sem erros no console nas páginas principais', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${page.url()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
  for (const path of PAGES) {
    await page.goto(`./${path}`);
    await page.waitForTimeout(700);
  }
  expect(errors).toEqual([]);
});
