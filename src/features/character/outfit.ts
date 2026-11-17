import type { CLEO_SPRITES } from './manifest.generated';

export type SpriteLayer = (typeof CLEO_SPRITES.layers)[number];

/** Camadas visuais além da base, na ordem de empilhamento. */
export interface Outfit {
  /** Peça de corpo (colete) — `null` para pelagem sem roupa. */
  body: 'vest' | null;
  /** Peça de cabeça. */
  head: 'crown' | 'hat' | 'bow' | null;
  /** Peça de pescoço. */
  neck: 'tie' | null;
}

export const DEFAULT_OUTFIT: Outfit = { body: 'vest', head: null, neck: null };

/** Ordem de desenho das camadas, de trás para frente. */
export function outfitLayers(outfit: Outfit): SpriteLayer[] {
  const layers: SpriteLayer[] = ['base'];
  if (outfit.body) layers.push(outfit.body);
  if (outfit.neck) layers.push(outfit.neck);
  if (outfit.head) layers.push(outfit.head);
  layers.push('fx');
  return layers;
}
