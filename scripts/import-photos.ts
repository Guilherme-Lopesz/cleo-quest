/**
 * Importa fotos reais de `photos-source/` para a galeria.
 * 1. Coloque as fotos em photos-source/ (originais são preservados, pasta ignorada pelo git).
 * 2. Descreva cada foto em photos-source/metadata.json:
 *    { "IMG_0001": { "alt": "Cleo dormindo na caixa", "date": "2026-03-10", "phase": "hoje", "tags": ["soneca","caixa"] } }
 * 3. pnpm photos:import
 */
import { join } from 'node:path';
import { importPhotos } from './photos/pipeline';

const root = process.cwd();
const photos = await importPhotos({
  sourceDir: join(root, 'photos-source'),
  outDir: join(root, 'public', 'images', 'gallery'),
  manifestPath: join(root, 'src', 'content', 'gallery', 'photos.json'),
  publicPrefix: '/images/gallery',
});
console.info(
  `galeria: ${photos.length} fotos no manifesto (${photos.filter((p) => p.placeholder).length} placeholders)`,
);
