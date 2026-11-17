import {
  domainError,
  err,
  ok,
  type CatalogItem,
  type CustomizationRecord,
  type DomainError,
  type EquipSlot,
  type InventoryEntry,
  type Result,
} from '../contracts';

export function emptyCustomization(now: Date): CustomizationRecord {
  return { id: 'main', equipped: {}, updatedAt: now.toISOString() };
}

/** Quantidade ainda utilizável de um item (consumíveis). */
export function remaining(entry: InventoryEntry | undefined): number {
  if (!entry) return 0;
  return Math.max(0, entry.quantity - entry.consumed);
}

export function equip(
  item: CatalogItem | undefined,
  entry: InventoryEntry | undefined,
  customization: CustomizationRecord,
  now: Date,
): Result<{ customization: CustomizationRecord; slot: EquipSlot }, DomainError> {
  if (!item) return err(domainError('ITEM_NOT_FOUND', 'Item desconhecido.'));
  if (!entry || entry.quantity < 1)
    return err(domainError('ITEM_NOT_OWNED', 'Você ainda não tem este item.'));
  if (item.kind === 'CONSUMABLE' || !item.equipSlot) {
    return err(domainError('ITEM_NOT_EQUIPPABLE', 'Este item não pode ser equipado.'));
  }
  const equipped = { ...customization.equipped, [item.equipSlot]: item.id };
  return ok({
    customization: { ...customization, equipped, updatedAt: now.toISOString() },
    slot: item.equipSlot,
  });
}

export function unequip(
  customization: CustomizationRecord,
  slot: EquipSlot,
  now: Date,
): CustomizationRecord {
  const equipped = { ...customization.equipped };
  delete equipped[slot];
  return { ...customization, equipped, updatedAt: now.toISOString() };
}

export function consume(
  item: CatalogItem | undefined,
  entry: InventoryEntry | undefined,
): Result<InventoryEntry, DomainError> {
  if (!item) return err(domainError('ITEM_NOT_FOUND', 'Item desconhecido.'));
  if (item.kind !== 'CONSUMABLE')
    return err(domainError('VALIDATION_FAILURE', 'Este item não é consumível.'));
  if (remaining(entry) < 1 || !entry)
    return err(domainError('ITEM_NOT_OWNED', 'Você não tem mais este item.'));
  return ok({ ...entry, consumed: entry.consumed + 1 });
}
