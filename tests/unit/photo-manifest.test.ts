import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PHASES } from '@/content/phases';
import { PhotoManifestSchema, parseManifest } from '@/features/gallery/photo-schema';
import { verifyManifestFiles } from '../../scripts/photos/pipeline';

const root = process.cwd();
const manifestPath = join(root, 'src', 'content', 'gallery', 'photos.json');

describe('manifesto de fotos', () => {
  const manifest = parseManifest(JSON.parse(readFileSync(manifestPath, 'utf8')));

  it('é válido e todos os arquivos existem em public/', () => {
    expect(manifest.length).toBeGreaterThan(0);
    expect(verifyManifestFiles(manifest, join(root, 'public'))).toEqual([]);
  });

  it('toda fase referenciada existe', () => {
    const ids = new Set(PHASES.map((p) => p.id));
    for (const p of manifest)
      if (p.phase) expect(ids.has(p.phase), `fase desconhecida: ${p.phase}`).toBe(true);
  });

  it('rejeita id duplicado e alt vazio', () => {
    const a = manifest[0]!;
    expect(() => PhotoManifestSchema.parse([a, { ...a }])).toThrow(/duplicado/);
    expect(() => PhotoManifestSchema.parse([{ ...a, alt: '' }])).toThrow();
  });
});
