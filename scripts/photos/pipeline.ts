/**
 * Pipeline de imagens (SAD §11.3): original → variantes otimizadas → thumbnail →
 * manifesto validado. Originais nunca são sobrescritos.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';
import { z } from 'zod';
import { PhotoManifestSchema, type Photo } from '../../src/features/gallery/photo-schema';

export const LARGE_MAX = 1600;
export const THUMB_MAX = 480;

const MetaSchema = z.record(
  z.string(),
  z.object({
    alt: z.string().min(3),
    caption: z.string().optional(),
    date: z.string().optional(),
    phase: z.string().optional(),
    tags: z.array(z.string()).optional(),
    featured: z.boolean().optional(),
  }),
);
export type PhotoMeta = z.infer<typeof MetaSchema>[string];

export interface ImportOptions {
  sourceDir: string;
  outDir: string; // public/images/gallery
  manifestPath: string; // src/content/gallery/photos.json
  publicPrefix: string; // "/images/gallery"
  placeholder?: boolean;
  /** Metadados por nome de arquivo (sem extensão). Se ausente, lê metadata.json do sourceDir. */
  meta?: Record<string, PhotoMeta>;
}

const toSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export async function importPhotos(opts: ImportOptions): Promise<Photo[]> {
  const metaFile = join(opts.sourceDir, 'metadata.json');
  const meta: Record<string, PhotoMeta> =
    opts.meta ??
    (existsSync(metaFile) ? MetaSchema.parse(JSON.parse(readFileSync(metaFile, 'utf8'))) : {});

  mkdirSync(join(opts.outDir, 'thumbs'), { recursive: true });
  const files = readdirSync(opts.sourceDir).filter((f) => /\.(jpe?g|png|webp|avif|heic)$/i.test(f));
  const existing: Photo[] = existsSync(opts.manifestPath)
    ? PhotoManifestSchema.parse(JSON.parse(readFileSync(opts.manifestPath, 'utf8')))
    : [];
  const byId = new Map(existing.map((p) => [p.id, p]));
  const problems: string[] = [];

  for (const file of files) {
    const stem = basename(file, extname(file));
    const id = toSlug(stem);
    const m = meta[stem] ?? meta[id];
    if (!m) {
      problems.push(`${file}: sem metadados (alt obrigatório) em metadata.json`);
      continue;
    }
    const input = sharp(join(opts.sourceDir, file), { failOn: 'none' }).rotate();
    const large = await input
      .clone()
      .resize({ width: LARGE_MAX, height: LARGE_MAX, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const thumb = await input
      .clone()
      .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 74 })
      .toBuffer();
    writeFileSync(join(opts.outDir, `${id}.webp`), large.data);
    writeFileSync(join(opts.outDir, 'thumbs', `${id}.webp`), thumb);
    const photo: Photo = {
      id,
      src: `${opts.publicPrefix}/${id}.webp`,
      thumbnail: `${opts.publicPrefix}/thumbs/${id}.webp`,
      width: large.info.width,
      height: large.info.height,
      alt: m.alt,
      tags: m.tags ?? [],
      ...(m.caption ? { caption: m.caption } : {}),
      ...(m.date ? { date: m.date } : {}),
      ...(m.phase ? { phase: m.phase } : {}),
      ...(m.featured ? { featured: true } : {}),
      ...(opts.placeholder ? { placeholder: true } : {}),
    };
    byId.set(id, photo);
  }

  if (problems.length) throw new Error(`Importação abortada:\n- ${problems.join('\n- ')}`);

  // Fotos reais substituem placeholders de mesmo id; manifesto fica ordenado por data/id.
  const all = [...byId.values()].sort(
    (a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.id.localeCompare(b.id),
  );
  const validated = PhotoManifestSchema.parse(all);
  writeFileSync(opts.manifestPath, JSON.stringify(validated, null, 2) + '\n');
  return validated;
}

/** Verifica que todo item do manifesto aponta para arquivos existentes (usado no build). */
export function verifyManifestFiles(manifest: Photo[], publicDir: string): string[] {
  const missing: string[] = [];
  for (const p of manifest) {
    for (const rel of [p.src, p.thumbnail]) {
      if (!existsSync(join(publicDir, rel))) missing.push(`${p.id}: ${rel}`);
    }
  }
  return missing;
}
