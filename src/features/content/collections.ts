import { getCollection, render, type CollectionEntry } from 'astro:content';

/**
 * Acesso tipado às coleções editoriais. Anotar os retornos contorna uma perda de
 * inferência do `astro check` com os overloads de `getCollection`.
 */
export type Chapter = CollectionEntry<'timeline'>;
export type DiaryEntry = CollectionEntry<'diary'>;
export type MuseumItem = CollectionEntry<'museum'>;

export async function timelineChapters(): Promise<Chapter[]> {
  const list: Chapter[] = await getCollection('timeline');
  return list.sort((a, b) => a.data.order - b.data.order);
}

export async function diaryEntries(): Promise<DiaryEntry[]> {
  const list: DiaryEntry[] = await getCollection('diary');
  return list.sort((a, b) => (b.data.date ?? '').localeCompare(a.data.date ?? ''));
}

export async function museumItems(): Promise<MuseumItem[]> {
  const list: MuseumItem[] = await getCollection('museum');
  return list.sort((a, b) => a.data.order - b.data.order);
}

export async function withContent<T extends Chapter | DiaryEntry | MuseumItem>(entries: T[]) {
  return Promise.all(
    entries.map(async (entry) => ({ entry, Content: (await render(entry)).Content })),
  );
}
