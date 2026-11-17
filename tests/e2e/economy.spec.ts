import { test, expect } from '@playwright/test';

test.describe('economia, inventário e casinha', () => {
  test('bônus inicial, compra atômica, equipar, persistir e decorar', async ({ page }) => {
    await page.goto('./loja/');
    await expect(page.locator('[data-shop-balance]')).toHaveText('50');

    // item caro: botão desabilitado (saldo insuficiente)
    const coroa = page.locator('.item-card[data-item-id="coroa"]');
    await expect(coroa.locator('[data-action="buy"]')).toBeDisabled();

    // compra o laço (45) — saldo cai para 5 e o cartão vira "No inventário"
    const laco = page.locator('.item-card[data-item-id="laco"]');
    await laco.locator('[data-action="buy"]').click();
    await expect(page.locator('.toast--success').filter({ hasText: /^Comprado!/ })).toBeVisible();
    await expect(page.locator('[data-shop-balance]')).toHaveText('25'); // +20 da conquista "primeiro item"
    await expect(laco).toHaveAttribute('data-state', 'owned');
    await expect(laco.locator('[data-action="buy"]')).toBeHidden();

    // inventário: colete já equipado (kit inicial), equipar o laço
    await page.goto('./inventario/');
    await expect(page.locator('.item-card[data-item-id="colete-teal"]')).toHaveAttribute(
      'data-state',
      'equipped',
    );
    const invLaco = page.locator('.item-card[data-item-id="laco"]');
    await expect(invLaco).toBeVisible();
    await invLaco.locator('[data-action="equip"]').click();
    await expect(invLaco).toHaveAttribute('data-state', 'equipped');
    await expect(page.locator('#inv-slots')).toContainText('Laço');
    // a prévia e a Cleo caminhante mostram a camada do laço
    await expect(page.locator('#inv-preview-stage [data-layer="bow"]')).toHaveCount(1);
    await expect(page.locator('#cleo-walker [data-layer="bow"]')).toHaveCount(1);

    // recarregar: tudo persiste
    await page.reload();
    await expect(page.locator('.item-card[data-item-id="laco"]')).toHaveAttribute(
      'data-state',
      'equipped',
    );
    await expect(page.locator('[data-wallet-balance]')).toHaveText('25');

    // casinha: slot vazio abre o seletor sem móveis compatíveis
    await page.goto('./casinha/');
    await page.locator('[data-slot="quarto-cama"] [data-slot-action="open"]').click();
    await expect(page.locator('#house-chooser')).toBeVisible();
    await expect(page.locator('#chooser-empty')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#house-chooser')).toBeHidden();
  });

  test('móvel comprado vai para o slot certo, persiste e a Cleo interage', async ({ page }) => {
    await page.goto('./loja/');
    await page.locator('.item-card[data-item-id="brinquedo-casinha"] [data-action="buy"]').click();
    await expect(page.locator('[data-shop-balance]')).toHaveText('40'); // 50 - 30 + 20 (conquista)
    await page.goto('./casinha/');
    await page.locator('[data-slot="brincadeiras-brinquedo"] [data-slot-action="open"]').click();
    await page.locator('#chooser-list .chooser__item').first().click();
    const slot = page.locator('[data-slot="brincadeiras-brinquedo"]');
    await expect(slot).toHaveAttribute('data-state', 'filled');
    await expect(slot.locator('[data-slot-name]')).toContainText('Novelo');
    await page.reload();
    await expect(page.locator('[data-slot="brincadeiras-brinquedo"]')).toHaveAttribute(
      'data-state',
      'filled',
    );
    // interação move a Cleo para a área de brincadeiras
    await page
      .locator('[data-slot="brincadeiras-brinquedo"] [data-slot-action="interact"]')
      .click();
    await expect(page.locator('[data-cleo-anchor="brincadeiras"] .cleo-sprite')).toHaveCount(1);
    await expect(
      page.locator('[data-cleo-anchor="brincadeiras"] .cleo-walker__bubble'),
    ).toBeVisible();
    // tirar o móvel
    await page.locator('[data-slot="brincadeiras-brinquedo"] [data-slot-action="remove"]').click();
    await expect(page.locator('[data-slot="brincadeiras-brinquedo"]')).toHaveAttribute(
      'data-state',
      'empty',
    );
  });

  test('apagar progresso exige confirmação e zera tudo', async ({ page }) => {
    await page.goto('./loja/');
    await page.locator('.item-card[data-item-id="petisco"] [data-action="buy"]').click();
    await expect(page.locator('[data-shop-balance]')).toHaveText('60');
    page.once('dialog', (d) => d.dismiss());
    await page.locator('#reset-progress').click();
    await expect(page.locator('[data-shop-balance]')).toHaveText('60');
    page.once('dialog', (d) => d.accept());
    await page.locator('#reset-progress').click();
    await expect(page.locator('[data-wallet-balance]')).toHaveText('50');
    await expect(page.locator('.item-card[data-item-id="petisco"] [data-qty]')).toBeHidden();
  });
});
