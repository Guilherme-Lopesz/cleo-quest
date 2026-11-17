import { z } from 'zod';
import items from '@/content/catalog/items.json';
import type { CatalogItem, ItemId } from '../contracts';
import type { Catalog } from '../application/deps';

const CatalogItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['FOOD', 'TOY', 'BOWL', 'DECORATION', 'OUTFIT', 'SPECIAL']),
  kind: z.enum(['COSMETIC', 'TOY', 'CONSUMABLE', 'FURNITURE', 'COLLECTIBLE']),
  price: z.number().int().nonnegative(),
  image: z.string().min(1),
  enabled: z.boolean(),
  stackable: z.boolean(),
  maxQuantity: z.number().int().positive().optional(),
  equipSlot: z.enum(['BODY', 'HEAD', 'NECK', 'SCENE']).optional(),
  spriteLayer: z.enum(['vest', 'crown', 'hat', 'bow', 'tie']).optional(),
  room: z.enum(['quarto', 'cozinha', 'brincadeiras', 'jardim']).optional(),
  interaction: z.enum(['sleep', 'play', 'eat', 'drink', 'scratch']).optional(),
});

const CatalogSchema = z.array(CatalogItemSchema).superRefine((list, ctx) => {
  const seen = new Set<string>();
  list.forEach((i, idx) => {
    if (seen.has(i.id))
      ctx.addIssue({ code: 'custom', message: `id duplicado: ${i.id}`, path: [idx, 'id'] });
    seen.add(i.id);
    if (i.kind === 'COSMETIC' && !i.equipSlot)
      ctx.addIssue({ code: 'custom', message: `${i.id}: cosmético sem equipSlot`, path: [idx] });
    if (i.kind === 'FURNITURE' && !i.room)
      ctx.addIssue({ code: 'custom', message: `${i.id}: móvel sem cômodo`, path: [idx] });
    if (i.kind === 'CONSUMABLE' && !i.stackable)
      ctx.addIssue({
        code: 'custom',
        message: `${i.id}: consumível deve ser empilhável`,
        path: [idx],
      });
  });
});

/** Catálogo validado no build (dados são dados, não código). */
export const CATALOG_ITEMS: CatalogItem[] = CatalogSchema.parse(items) as CatalogItem[];

export function createCatalog(list: CatalogItem[] = CATALOG_ITEMS): Catalog {
  const map = new Map(list.map((i) => [i.id as string, i]));
  return {
    list: () => list,
    get: (id: ItemId | string) => map.get(id),
  };
}
