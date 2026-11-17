import { chromium } from '@playwright/test';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 420, height: 860 } });
const errors: string[] = [];
p.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
});
p.on('pageerror', (e) => errors.push(String(e)));
const scripts: string[] = [];
p.on('request', (r) => {
  if (r.resourceType() === 'script') scripts.push(r.url().split('/').pop()!);
});
await p.goto('http://localhost:4321/cleo-quest/parque/yarn-catcher/');
await p.waitForTimeout(500);
console.log(
  'scripts antes de começar:',
  scripts.filter((s) => /phaser/.test(s)),
);
await p.getByRole('button', { name: 'Começar' }).click();
await p.waitForSelector('#game-stage canvas', { timeout: 15000 });
console.log(
  'phaser carregado após começar:',
  scripts.filter((s) => /phaser/.test(s)),
);
await p.waitForTimeout(1500);
await p.screenshot({ path: '/tmp/yarn-1.png' });
// movimenta com teclado e toque
await p.keyboard.down('ArrowLeft');
await p.waitForTimeout(600);
await p.keyboard.up('ArrowLeft');
const box = (await p.locator('#game-stage canvas').boundingBox())!;
await p.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.5);
await p.waitForTimeout(4000);
await p.screenshot({ path: '/tmp/yarn-2.png' });
console.log(
  'hearts:',
  await p.locator('#game-hearts').textContent(),
  'score:',
  await p.locator('#game-score').textContent(),
  'timer:',
  await p.locator('#game-timer').textContent(),
);
// pausa e retoma
await p.locator('#game-pause').click();
await p.waitForTimeout(300);
console.log('phase paused:', await p.locator('#game-root').getAttribute('data-phase'));
await p.getByRole('button', { name: 'Continuar' }).click();
await p.waitForTimeout(300);
console.log('phase after resume:', await p.locator('#game-root').getAttribute('data-phase'));
console.log('errors:', errors);
await b.close();
