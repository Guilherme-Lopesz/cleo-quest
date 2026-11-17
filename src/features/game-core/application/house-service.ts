import { ok, type DomainError, type HouseRecord, type ItemId, type Result } from '../contracts';
import { emptyHouse, place, remove } from '../domain/house-rules';
import type { CoreDeps } from './deps';
import { guarded, unwrap } from './persistence-helpers';

export class HouseService {
  constructor(private readonly deps: CoreDeps) {}

  get(): Promise<HouseRecord> {
    return this.deps.store.read(
      ['house'],
      async (t) => (await t.house.get('main')) ?? emptyHouse(this.deps.clock.now()),
    );
  }

  async place(slotId: string, itemId: ItemId): Promise<Result<HouseRecord, DomainError>> {
    const { store, clock, bus, catalog } = this.deps;
    const result = await guarded(() =>
      store.transaction(['house', 'inventory'], async (t) => {
        const now = clock.now();
        const house = (await t.house.get('main')) ?? emptyHouse(now);
        const entry = await t.inventory.get(itemId);
        const next = unwrap(place(house, slotId, catalog.get(itemId), entry, now));
        await t.house.put(next);
        return ok(next);
      }),
    );
    if (result.ok) bus.publish({ type: 'HouseDecorated', slotId, itemId });
    return result;
  }

  async remove(slotId: string): Promise<Result<HouseRecord, DomainError>> {
    const { store, clock, bus } = this.deps;
    const result = await guarded(() =>
      store.transaction(['house'], async (t) => {
        const now = clock.now();
        const house = (await t.house.get('main')) ?? emptyHouse(now);
        const next = remove(house, slotId, now);
        await t.house.put(next);
        return ok(next);
      }),
    );
    if (result.ok) bus.publish({ type: 'HouseDecorated', slotId, itemId: null });
    return result;
  }
}
