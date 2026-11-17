import { DexieProgressStore } from '@infra/persistence/dexie-store';
import { CleoDatabase } from '@infra/persistence/dexie-db';
import { itemId } from '@core/contracts';
import { gameCoreContractSuite, makeCore } from './game-core.shared';

gameCoreContractSuite(
  'DexieProgressStore (IndexedDB)',
  () => new DexieProgressStore(new CleoDatabase()),
);

describe('Dexie: atomicidade, persistência e recuperação', () => {
  it('falha no meio da compra aborta a transação inteira', async () => {
    const db = new CleoDatabase();
    const store = new DexieProgressStore(db);
    const core = makeCore(store);
    await core.init();
    // sabotagem: a tabela de recibos rejeita a gravação (hook do Dexie dentro da transação)
    const sabotage = () => {
      throw new Error('disco cheio simulado');
    };
    db.purchases.hook('creating', sabotage);
    const r = await core.shop.purchase(itemId('laco'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('PERSISTENCE_FAILURE');
    db.purchases.hook('creating').unsubscribe(sabotage);
    expect(await core.economy.getBalance()).toBe(50);
    expect(await core.inventory.list()).toEqual([]);
    expect(await db.purchases.count()).toBe(0);
  });

  it('dados sobrevivem a reabrir o banco (simula recarregar a página)', async () => {
    const first = makeCore(new DexieProgressStore(new CleoDatabase()));
    await first.init();
    await first.shop.purchase(itemId('laco'));
    await first.inventory.equip(itemId('laco'));

    const second = makeCore(new DexieProgressStore(new CleoDatabase()));
    await second.init();
    expect(await second.economy.getBalance()).toBe(5);
    expect((await second.inventory.getCustomization()).equipped.HEAD).toBe('laco');
  });

  it('registro corrompido não é sobrescrito: a operação falha com VALIDATION_FAILURE', async () => {
    const db = new CleoDatabase();
    const core = makeCore(new DexieProgressStore(db));
    await core.init();
    await db.wallet.put({ id: 'main', balance: -40, updatedAt: 'x' } as never);
    const r = await core.shop.purchase(itemId('petisco'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('VALIDATION_FAILURE');
    // dado permanece para recuperação/reset explícito
    expect((await db.wallet.get('main'))?.balance).toBe(-40);
  });

  it('migração: um banco v1 existente é aberto sem perda de dados', async () => {
    // fixture v1 gravada "à mão", como se fosse de uma visita anterior
    const seed = new CleoDatabase();
    await seed.wallet.put({
      id: 'main',
      balance: 123 as never,
      updatedAt: new Date().toISOString(),
    });
    await seed.profiles.put({ id: 'main', createdAt: new Date().toISOString(), schemaVersion: 1 });
    seed.close();

    const core = makeCore(new DexieProgressStore(new CleoDatabase()));
    await core.init();
    expect(await core.economy.getBalance()).toBe(123 + 50);
    const exported = await core.progress.exportBackup();
    expect(exported['wallet']).toHaveLength(1);
  });
});
