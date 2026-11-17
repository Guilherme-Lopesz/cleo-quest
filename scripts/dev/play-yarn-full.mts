import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 420, height: 860 } });
const errors: string[] = [];
p.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
p.on('pageerror', (e) => errors.push(String(e)));
await p.goto('http://localhost:4321/cleo-quest/parque/yarn-catcher/');
await p.getByRole('button', { name: 'Começar' }).click();
await p.waitForSelector('#game-stage canvas', { timeout: 15000 });
const box = (await p.locator('#game-stage canvas').boundingBox())!;
// joga 62s movendo aleatoriamente
const t0 = Date.now();
while (Date.now() - t0 < 62_000) {
  await p.mouse.click(box.x + box.width * Math.random(), box.y + box.height * 0.5);
  await p.waitForTimeout(400);
  if ((await p.locator('#game-root').getAttribute('data-phase')) === 'result') break;
}
await p.waitForSelector('.game-result', { timeout: 20000 });
await p.screenshot({ path: '/tmp/yarn-result.png' });
const txt = await p.locator('.game-overlay__panel').innerText();
console.log(txt.replace(/\n+/g, ' | '));
console.log('header balance:', await p.locator('[data-wallet-balance]').textContent());
await p.reload();
await p.waitForTimeout(1500);
console.log('header balance after reload:', await p.locator('[data-wallet-balance]').textContent());
console.log('errors:', errors);
await b.close();
