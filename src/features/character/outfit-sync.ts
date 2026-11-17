import type { CatalogItem, CustomizationRecord } from '@core/contracts';
import { DEFAULT_OUTFIT, type Outfit } from './outfit';

/** Traduz a customização persistida (slots → itemId) em camadas de sprite. */
export function outfitFromCustomization(
  equipped: CustomizationRecord['equipped'] | Partial<Record<string, string>>,
  lookup: (id: string) => CatalogItem | undefined,
): Outfit {
  const layer = (slot: 'BODY' | 'HEAD' | 'NECK') => {
    const id = (equipped as Partial<Record<string, string>>)[slot];
    return id ? (lookup(id)?.spriteLayer ?? null) : null;
  };
  const body = layer('BODY');
  const head = layer('HEAD');
  const neck = layer('NECK');
  return {
    body: body === 'vest' ? 'vest' : null,
    head: head === 'crown' || head === 'hat' || head === 'bow' ? head : null,
    neck: neck === 'tie' ? 'tie' : null,
  };
}

export { DEFAULT_OUTFIT };
