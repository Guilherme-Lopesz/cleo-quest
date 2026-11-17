import { test, expect } from '@playwright/test';

test.describe('galeria', () => {
  test('filtra por fase e abre/fecha o lightbox com teclado', async ({ page }) => {
    await page.goto('./galeria/');
    const cards = page.locator('[data-photo-id]:visible');
    const total = await cards.count();
    expect(total).toBeGreaterThan(0);

    await page.selectOption('#filter-phase', 'filhote');
    await expect(page.locator('#gallery-count')).toContainText('fotos');
    const filtered = await page.locator('[data-photo-id]:visible').count();
    expect(filtered).toBeLessThan(total);
    await expect(page).toHaveURL(/fase=filhote/);

    await page.locator('[data-lightbox-open]:visible').first().click();
    const dialog = page.locator('#lightbox');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-lightbox-counter]')).toContainText(`1 de ${filtered}`);
    await expect(dialog.locator('[data-lightbox-close]')).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(dialog.locator('[data-lightbox-counter]')).toContainText(`2 de ${filtered}`);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    // foco volta para o botão que abriu
    await expect(page.locator('[data-lightbox-open]:visible').first()).toBeFocused();
  });

  test('imagens da grade têm alt, dimensões e lazy loading', async ({ page }) => {
    await page.goto('./galeria/');
    const imgs = page.locator('.gallery-grid img');
    const n = await imgs.count();
    for (let i = 0; i < n; i++) {
      const img = imgs.nth(i);
      expect((await img.getAttribute('alt'))?.length).toBeGreaterThan(2);
      expect(await img.getAttribute('width')).toBeTruthy();
      expect(await img.getAttribute('height')).toBeTruthy();
      if (i >= 4) expect(await img.getAttribute('loading')).toBe('lazy');
    }
  });
});

test.describe('história', () => {
  test('timeline mostra capítulos e a máquina do tempo navega', async ({ page }) => {
    await page.goto('./historia/');
    await expect(page.locator('.chapter')).toHaveCount(4);
    const range = page.locator('[data-tm-range]');
    const img = page.locator('[data-tm-img]');
    const firstSrc = await img.getAttribute('src');
    await page.locator('[data-tm-next]').click();
    await expect(range).toHaveValue('1');
    expect(await img.getAttribute('src')).not.toBe(firstSrc);
    await page.locator('[data-tm-prev]').click();
    await expect(range).toHaveValue('0');
    expect(await img.getAttribute('src')).toBe(firstSrc);
    await range.focus();
    await page.keyboard.press('ArrowRight');
    await expect(range).toHaveValue('1');
  });
});
