import { MemoryProgressStore } from '@infra/persistence/memory-store';
import { itemId } from '@core/contracts';
import { gameCoreContractSuite, makeCore } from './game-core.shared';

gameCoreContractSuite('MemoryProgressStore', () => new MemoryProgressStore());

describe('rollback em memória', () => {
  it('falha ao gravar o recibo desfaz débito e inventário', async () => {
    const store = new MemoryProgressStore();
    const core = makeCore(store);
    await core.init();
    store.failOnPut = (t) => t === 'purchases';
    const r = await core.shop.purchase(itemId('laco'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('PERSISTENCE_FAILURE');
    store.failOnPut = null;
    expect(await core.economy.getBalance()).toBe(50);
    expect((await core.inventory.list()).map((e) => e.itemId)).toEqual(['colete-teal']);
  });
});
