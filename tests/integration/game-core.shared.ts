import { GameCore } from '@core/application/game-core';
import { GAME_IDS } from '@core/config/games';
import { itemId, rewardSourceId, type ProgressStore } from '@core/contracts';

const clock = { now: () => new Date('2026-11-17T03:00:00Z') };
let counter = 0;
const ids = { next: (p: string) => `${p}_${++counter}` };

export function makeCore(store: ProgressStore, achievements = false): GameCore {
  return new GameCore({ store, clock, ids, achievements });
}

/** Suíte compartilhada: contrato de comportamento que toda implementação de store deve cumprir. */
export function gameCoreContractSuite(label: string, factory: () => ProgressStore) {
  describe(`Game Core sobre ${label}`, () => {
    let core: GameCore;
    beforeEach(async () => {
      counter = 0;
      core = makeCore(factory());
      await core.init();
    });

    it('bônus de boas-vindas é concedido uma única vez', async () => {
      expect(await core.economy.getBalance()).toBe(50);
      await core.init();
      await core.economy.grantWelcomeBonus();
      expect(await core.economy.getBalance()).toBe(50);
    });

    it('grantReward é idempotente por sourceId', async () => {
      const src = rewardSourceId('special:x');
      const a = await core.economy.grantReward({
        sourceId: src,
        amount: 20,
        reason: 'SPECIAL_EVENT',
      });
      const b = await core.economy.grantReward({
        sourceId: src,
        amount: 20,
        reason: 'SPECIAL_EVENT',
      });
      expect(a.ok && a.value.granted).toBe(true);
      expect(b.ok && b.value.granted).toBe(false);
      expect(await core.economy.getBalance()).toBe(70);
    });

    it('fluxo completo: iniciar → perder coração → finalizar → recompensa única', async () => {
      const events: string[] = [];
      core.bus.onAny((e) => events.push(e.type));
      const start = await core.sessions.start(GAME_IDS.yarn);
      expect(start.ok).toBe(true);
      if (!start.ok) return;
      const sid = start.value.id;
      const lost = await core.sessions.loseHeart(sid);
      expect(lost.ok && lost.value.hearts).toBe(4);

      const done = await core.sessions.complete(sid, {
        score: 50,
        outcome: 'WIN',
        durationMs: 20_000,
        metrics: { captures: 10 },
      });
      expect(done.ok).toBe(true);
      if (!done.ok) return;
      expect(done.value.rewardGranted).toBe(20);
      expect(await core.economy.getBalance()).toBe(70);

      // reenvio (ex.: retry após falha de rede/UI): não paga de novo
      const again = await core.sessions.complete(sid, {
        score: 999,
        outcome: 'WIN',
        durationMs: 20_000,
      });
      expect(again.ok && again.value.rewardGranted).toBe(20);
      expect(await core.economy.getBalance()).toBe(70);

      // sessão encerrada não aceita mais ações
      const late = await core.sessions.loseHeart(sid);
      expect(late.ok).toBe(false);

      const stats = await core.progress.statistics();
      expect(stats.gamesPlayed).toBe(1);
      expect(stats.gamesWon).toBe(1);
      expect(stats.bestScores['yarn-catcher']).toBe(50);
      expect(stats.capturesByGame['yarn-catcher']).toBe(10);
      expect(stats.heartsLost).toBe(1);
      expect(events).toEqual(
        expect.arrayContaining(['SessionStarted', 'HeartLost', 'GameCompleted', 'RewardGranted']),
      );
    });

    it('zero corações encerra a partida; resultado final vira LOSS com recompensa de participação', async () => {
      const start = await core.sessions.start(GAME_IDS.yarn);
      if (!start.ok) throw new Error('start');
      for (let i = 0; i < 5; i++) await core.sessions.loseHeart(start.value.id);
      const s = await core.sessions.get(start.value.id);
      expect(s?.status).toBe('FAILED');
      expect(await core.sessions.getActive()).toBeNull();
      const done = await core.sessions.complete(start.value.id, {
        score: 20,
        outcome: 'WIN',
        durationMs: 5000,
      });
      expect(done.ok && done.value.outcome).toBe('LOSS');
      expect(done.ok && done.value.rewardGranted).toBe(9);
    });

    it('resultado implausível encerra sem recompensa (D-008)', async () => {
      const start = await core.sessions.start(GAME_IDS.yarn);
      if (!start.ok) throw new Error('start');
      const done = await core.sessions.complete(start.value.id, {
        score: 99_999,
        outcome: 'WIN',
        durationMs: 5000,
      });
      expect(done.ok && done.value.rewardGranted).toBe(0);
      expect(await core.economy.getBalance()).toBe(50);
    });

    it('nova partida restaura corações e abandona a anterior', async () => {
      const a = await core.sessions.start(GAME_IDS.yarn);
      if (!a.ok) throw new Error('a');
      await core.sessions.loseHeart(a.value.id);
      const b = await core.sessions.start(GAME_IDS.fishing);
      expect(b.ok && b.value.hearts).toBe(5);
      expect((await core.sessions.get(a.value.id))?.status).toBe('ABANDONED');
    });

    it('compra atômica: debita, adiciona ao inventário e registra recibo', async () => {
      const r = await core.shop.purchase(itemId('laco'));
      expect(r.ok).toBe(true);
      expect(await core.economy.getBalance()).toBe(5);
      const inv = await core.inventory.list();
      expect(inv.find((e) => e.itemId === 'laco')?.quantity).toBe(1);
      const again = await core.shop.purchase(itemId('laco'));
      expect(again.ok).toBe(false);
      if (!again.ok) expect(again.error.code).toBe('ITEM_LIMIT_REACHED');
    });

    it('saldo insuficiente: nada muda', async () => {
      const r = await core.shop.purchase(itemId('coroa'));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('INSUFFICIENT_FUNDS');
      expect(await core.economy.getBalance()).toBe(50);
      expect((await core.inventory.list()).map((e) => e.itemId)).toEqual(['colete-teal']);
    });

    it('equipar exige posse; depois de comprar, equipa e persiste', async () => {
      const no = await core.inventory.equip(itemId('laco'));
      expect(no.ok).toBe(false);
      if (!no.ok) expect(no.error.code).toBe('ITEM_NOT_OWNED');
      await core.shop.purchase(itemId('laco'));
      const yes = await core.inventory.equip(itemId('laco'));
      expect(yes.ok && yes.value.equipped.HEAD).toBe('laco');
      expect((await core.inventory.getCustomization()).equipped.HEAD).toBe('laco');
      await core.inventory.unequip('HEAD');
      expect((await core.inventory.getCustomization()).equipped.HEAD).toBeUndefined();
    });

    it('consumível: compra 2, consome 2, terceiro falha', async () => {
      await core.shop.purchase(itemId('petisco'), 2);
      expect((await core.inventory.consume(itemId('petisco'))).ok).toBe(true);
      expect((await core.inventory.consume(itemId('petisco'))).ok).toBe(true);
      expect((await core.inventory.consume(itemId('petisco'))).ok).toBe(false);
    });

    it('conquista única paga uma vez e registra progresso cumulativo', async () => {
      core = makeCore(factory(), true);
      await core.init();
      await core.shop.purchase(itemId('petisco'));
      // o listener de conquistas é assíncrono
      await new Promise((r) => setTimeout(r, 20));
      const recs = await core.achievements.listRecords();
      const first = recs.find((r) => r.achievementId === 'primeiro-item');
      expect(first?.unlockedAt).toBeTruthy();
      const balance = await core.economy.getBalance();
      expect(balance).toBe(50 - 10 + 20);
      await core.shop.purchase(itemId('petisco'));
      await new Promise((r) => setTimeout(r, 20));
      expect(await core.economy.getBalance()).toBe(balance - 10);
      const col = (await core.achievements.listRecords()).find(
        (r) => r.achievementId === 'colecionador',
      );
      expect(col?.progress).toBe(2); // colete do kit inicial + petisco
      expect(col?.unlockedAt).toBeUndefined();
    });

    it('capítulos explorados recompensam uma única vez', async () => {
      expect(await core.achievements.recordChapter('01', 10)).toBe(true);
      expect(await core.achievements.recordChapter('01', 10)).toBe(false);
      expect(await core.economy.getBalance()).toBe(60);
    });

    it('casinha: coloca móvel comprado no slot certo e persiste', async () => {
      await core.economy.grantReward({
        sourceId: rewardSourceId('t'),
        amount: 200,
        reason: 'SPECIAL_EVENT',
      });
      await core.shop.purchase(itemId('caminha'));
      const bad = await core.house.place('cozinha-racao', itemId('caminha'));
      expect(bad.ok).toBe(false);
      const good = await core.house.place('quarto-cama', itemId('caminha'));
      expect(good.ok).toBe(true);
      expect((await core.house.get()).placements).toEqual([
        { slotId: 'quarto-cama', itemId: 'caminha' },
      ]);
    });

    it('reset apaga tudo e o próximo init recomeça do zero', async () => {
      await core.shop.purchase(itemId('laco'));
      await core.progress.resetAll();
      expect(await core.inventory.list()).toEqual([]);
      expect(await core.economy.getBalance()).toBe(0);
      await core.init();
      expect(await core.economy.getBalance()).toBe(50);
    });

    it('estado de UI reflete saldo e sessão ativa', async () => {
      const start = await core.sessions.start(GAME_IDS.yarn);
      await core.refreshUi();
      expect(core.ui.get().balance).toBe(50);
      expect(core.ui.get().activeSessionId).toBe(start.ok ? start.value.id : null);
      expect(core.ui.get().hearts).toBe(5);
    });
  });
}

describe('kit inicial', () => {
  it('na primeira visita o colete teal já está no inventário e equipado', async () => {
    const { MemoryProgressStore } = await import('@infra/persistence/memory-store');
    const core = makeCore(new MemoryProgressStore());
    await core.init();
    expect((await core.inventory.getCustomization()).equipped.BODY).toBe('colete-teal');
    expect(await core.economy.getBalance()).toBe(50);
    expect(core.ui.get().equipped.BODY).toBe('colete-teal');
  });
});
