import {
  domainError,
  err,
  ok,
  type CatalogItem,
  type DomainError,
  type HouseRecord,
  type HouseRoom,
  type InventoryEntry,
  type ItemId,
  type Result,
} from '../contracts';

export interface HouseSlot {
  id: string;
  room: HouseRoom;
  label: string;
}

/** Slots predefinidos (Mestre §5.7, decisão D-005). */
export const HOUSE_SLOTS: HouseSlot[] = [
  { id: 'quarto-cama', room: 'quarto', label: 'Cama' },
  { id: 'quarto-cobertor', room: 'quarto', label: 'Cobertor' },
  { id: 'cozinha-racao', room: 'cozinha', label: 'Pote de ração' },
  { id: 'cozinha-agua', room: 'cozinha', label: 'Pote de água' },
  { id: 'brincadeiras-brinquedo', room: 'brincadeiras', label: 'Brinquedo' },
  { id: 'brincadeiras-arranhador', room: 'brincadeiras', label: 'Arranhador' },
  { id: 'jardim-planta', room: 'jardim', label: 'Planta' },
];

export function emptyHouse(now: Date): HouseRecord {
  return { id: 'main', placements: [], updatedAt: now.toISOString() };
}

export function place(
  house: HouseRecord,
  slotId: string,
  item: CatalogItem | undefined,
  entry: InventoryEntry | undefined,
  now: Date,
): Result<HouseRecord, DomainError> {
  const slot = HOUSE_SLOTS.find((s) => s.id === slotId);
  if (!slot) return err(domainError('INVALID_PLACEMENT', 'Esse lugar não existe na casinha.'));
  if (!item) return err(domainError('ITEM_NOT_FOUND', 'Item desconhecido.'));
  if (!entry || entry.quantity < 1)
    return err(domainError('ITEM_NOT_OWNED', 'Você ainda não tem este item.'));
  if (item.kind !== 'FURNITURE' || item.room !== slot.room) {
    return err(domainError('INVALID_PLACEMENT', 'Este item não cabe nesse lugar.'));
  }
  const placements = house.placements.filter((p) => p.slotId !== slotId && p.itemId !== item.id);
  placements.push({ slotId, itemId: item.id });
  return ok({ ...house, placements, updatedAt: now.toISOString() });
}

export function remove(house: HouseRecord, slotId: string, now: Date): HouseRecord {
  return {
    ...house,
    placements: house.placements.filter((p) => p.slotId !== slotId),
    updatedAt: now.toISOString(),
  };
}

export function itemAt(house: HouseRecord, slotId: string): ItemId | null {
  return house.placements.find((p) => p.slotId === slotId)?.itemId ?? null;
}
