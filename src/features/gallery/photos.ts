import manifest from '@/content/gallery/photos.json';
import { parseManifest, sortByDate, type Photo } from './photo-schema';

/** Manifesto validado no build: um erro aqui derruba o `astro build` de propósito. */
export const PHOTOS: Photo[] = sortByDate(parseManifest(manifest));

export function photoById(id: string): Photo | undefined {
  return PHOTOS.find((p) => p.id === id);
}

export function photosByIds(ids: readonly string[]): Photo[] {
  return ids.map(photoById).filter((p): p is Photo => Boolean(p));
}

export function allTags(photos: Photo[] = PHOTOS): string[] {
  return [...new Set(photos.flatMap((p) => p.tags))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
