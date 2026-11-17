import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseManifest } from '@/features/gallery/photo-schema';

// Garante que capítulos, diário e museu só referenciam fotos existentes.
const root = process.cwd();
const ids = new Set(
  parseManifest(
    JSON.parse(readFileSync(join(root, 'src/content/gallery/photos.json'), 'utf8')),
  ).map((p) => p.id),
);
const refs = (dir: string, key: string): string[] =>
  readdirSync(join(root, 'src/content', dir))
    .filter((f) => f.endsWith('.md'))
    .flatMap((f) => {
      const text = readFileSync(join(root, 'src/content', dir, f), 'utf8');
      const m = text.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
      if (!m) return [];
      return [...m[1]!.matchAll(/"([^"]+)"/g)].map((x) => x[1]!);
    });

describe('conteúdo editorial', () => {
  it.each([
    ['timeline', 'photos'],
    ['diary', 'photo'],
    ['museum', 'photo'],
  ])('%s referencia apenas fotos do manifesto', (dir, key) => {
    for (const id of refs(dir, key)) expect(ids.has(id), `foto inexistente: ${id}`).toBe(true);
  });
});
