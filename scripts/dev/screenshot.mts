// Captura a página em desktop e mobile e lista erros de console. Uso: tsx scripts/dev/screenshot.mts [url] [nome]
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:4321/cleo-quest/';
const name = process.argv[3] ?? 'shot';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
for (const [vp, w, h] of [
  ['desktop', 1280, 900],
  ['mobile', 390, 844],
] as const) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  const errors: string[] = [];
  p.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(url);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `/tmp/${name}-${vp}.png`, fullPage: process.argv.includes('--full') });
  console.log(vp, 'errors:', errors);
  await p.close();
}
await b.close();
