/**
 * Gera os spritesheets da Cleo por camada + manifesto de animações.
 * Saída: public/pixel-art/cleo/<layer>.png e public/pixel-art/cleo/manifest.json
 * Uso: pnpm sprites [--preview]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PixelCanvas } from './canvas';
import { ANIMATIONS } from './animations';
import { drawCleo, FRAME, type Layer } from './cleo';

const OUT = join(process.cwd(), 'public', 'pixel-art', 'cleo');
const LAYERS: Layer[] = ['base', 'vest', 'crown', 'hat', 'bow', 'tie', 'fx'];
const PREVIEW = process.argv.includes('--preview');

mkdirSync(OUT, { recursive: true });

// Layout: uma linha por animação, um frame por coluna. Largura = maior nº de frames.
const cols = Math.max(...ANIMATIONS.map((a) => a.frames.length));
const rows = ANIMATIONS.length;

const sheets = new Map<Layer, PixelCanvas>();
for (const layer of LAYERS) sheets.set(layer, new PixelCanvas(cols * FRAME, rows * FRAME));

ANIMATIONS.forEach((anim, row) => {
  anim.frames.forEach((pose, col) => {
    LAYERS.forEach((layer) => {
      const frame = drawCleo(pose, layer, col);
      sheets.get(layer)!.blit(frame, col * FRAME, row * FRAME);
    });
  });
});

for (const [layer, sheet] of sheets) {
  writeFileSync(join(OUT, `${layer}.png`), sheet.toPNG());
}

const manifest = {
  frameWidth: FRAME,
  frameHeight: FRAME,
  columns: cols,
  layers: LAYERS,
  animations: Object.fromEntries(
    ANIMATIONS.map((a, row) => [
      a.name,
      { row, frames: a.frames.length, fps: a.fps, loop: a.loop },
    ]),
  ),
};
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
// Cópia tipada para o runtime (evita fetch do manifesto no carregamento da página).
writeFileSync(
  join(process.cwd(), 'src', 'features', 'character', 'manifest.generated.ts'),
  `// Gerado por scripts/sprites/generate.ts — não editar à mão.\nexport const CLEO_SPRITES = ${JSON.stringify(manifest, null, 2)} as const;\n`,
);

if (PREVIEW) {
  // composição base+vest+fx ampliada para inspeção
  const composite = new PixelCanvas(cols * FRAME, rows * FRAME);
  composite.blit(sheets.get('base')!);
  composite.blit(sheets.get('vest')!);
  composite.blit(sheets.get('fx')!);
  writeFileSync(join(process.cwd(), 'preview-cleo.png'), composite.scaled(6).toPNG());
  const acc = new PixelCanvas(cols * FRAME, rows * FRAME);
  acc.blit(sheets.get('base')!);
  acc.blit(sheets.get('vest')!);
  acc.blit(sheets.get('crown')!);
  acc.blit(sheets.get('tie')!);
  writeFileSync(join(process.cwd(), 'preview-cleo-acc.png'), acc.scaled(6).toPNG());
}
console.info(`sprites: ${LAYERS.length} camadas, ${rows} animações, ${cols} colunas → ${OUT}`);
