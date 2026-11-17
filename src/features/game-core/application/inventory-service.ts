import {
  domainError,
  err,
  ok,
  type CustomizationRecord,
  type DomainError,
  type EquipSlot,
  type InventoryEntry,
  type ItemId,
  type Result,
} from '../contracts';
import { consume, emptyCustomization, equip, unequip } from '../domain/inventory-rules';
import type { CoreDeps } from './deps';
import { guarded, unwrap } from './persistence-helpers';

export class InventoryService {
  constructor(private readonly deps: CoreDeps) {}

  list(): Promise<InventoryEntry[]> {
    return this.deps.store.read(['inventory'], (t) => t.inventory.list());
  }

  get(itemId: ItemId): Promise<InventoryEntry | null> {
    return this.deps.store.read(
      ['inventory'],
      async (t) => (await t.inventory.get(itemId)) ?? null,
    );
  }

  getCustomization(): Promise<CustomizationRecord> {
    return this.deps.store.read(
      ['customization'],
      async (t) => (await t.customization.get('main')) ?? emptyCustomization(this.deps.clock.now()),
    );
  }

  async equip(itemId: ItemId): Promise<Result<CustomizationRecord, DomainError>> {
    const { store, clock, bus, catalog } = this.deps;
    let slot: EquipSlot | null = null;
    const result = await guarded(() =>
      store.transaction(['inventory', 'customization'], async (t) => {
        const now = clock.now();
        const entry = await t.inventory.get(itemId);
        const current = (await t.customization.get('main')) ?? emptyCustomization(now);
        const next = unwrap(equip(catalog.get(itemId), entry, current, now));
        slot = next.slot;
        await t.customization.put(next.customization);
        return ok(next.customization);
      }),
    );
    if (result.ok && slot) bus.publish({ type: 'ItemEquipped', itemId, slot });
    return result;
  }

  async unequip(slot: EquipSlot): Promise<Result<CustomizationRecord, DomainError>> {
    const { store, clock, bus } = this.deps;
    const result = await guarded(() =>
      store.transaction(['customization'], async (t) => {
        const now = clock.now();
        const current = (await t.customization.get('main')) ?? emptyCustomization(now);
        const next = unequip(current, slot, now);
        await t.customization.put(next);
        return ok(next);
      }),
    );
    if (result.ok) bus.publish({ type: 'ItemUnequipped', slot });
    return result;
  }

  /** Consumir reduz a quantidade utilizável; o item permanece no histórico do inventário. */
  async consume(itemId: ItemId): Promise<Result<InventoryEntry, DomainError>> {
    const { store, bus, catalog } = this.deps;
    const result = await guarded(() =>
      store.transaction(['inventory'], async (t) => {
        const entry = await t.inventory.get(itemId);
        const next = unwrap(consume(catalog.get(itemId), entry));
        await t.inventory.put(next);
        return ok(next);
      }),
    );
    if (result.ok)
      bus.publish({
        type: 'ItemConsumed',
        itemId,
        remaining: result.value.quantity - result.value.consumed,
      });
    if (!result.ok && result.error.code === 'ITEM_NOT_FOUND')
      return err(domainError('ITEM_NOT_FOUND', 'Item desconhecido.'));
    return result;
  }
}
