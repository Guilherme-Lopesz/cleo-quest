import {
  ok,
  rewardSourceId,
  type AchievementDefinition,
  type AchievementId,
  type AchievementRecord,
  type DomainEvent,
  type StatisticsRecord,
} from '../contracts';
import { ACHIEVEMENTS, EASTER_EGGS } from '../config/achievements';
import { emptyStatistics } from '../domain/statistics-rules';
import type { CoreDeps } from './deps';
import type { EconomyService } from './economy-service';
import { guarded } from './persistence-helpers';

/**
 * Conquistas (Mestre §5.8, SAD §6.6). Avalia critérios a partir de eventos de
 * domínio e do estado persistido; desbloqueio e recompensa são idempotentes
 * (claim `achievement:<id>`).
 */
export class AchievementService {
  constructor(
    private readonly deps: CoreDeps,
    private readonly economy: EconomyService,
  ) {}

  definitions(): AchievementDefinition[] {
    return ACHIEVEMENTS;
  }

  listRecords(): Promise<AchievementRecord[]> {
    return this.deps.store.read(['achievements'], (t) => t.achievements.list());
  }

  /** Liga o serviço ao Event Bus; devolve função para desligar. */
  attach(): () => void {
    return this.deps.bus.onAny((e) => {
      void this.evaluate(e).catch((err: unknown) => console.error('[achievements]', err));
    });
  }

  /** Registra um easter egg encontrado (uma vez) e avalia conquistas. */
  async recordEasterEgg(eggId: string): Promise<boolean> {
    if (!(EASTER_EGGS as readonly string[]).includes(eggId)) return false;
    const { store, bus } = this.deps;
    const added = await guarded(() =>
      store.transaction(['statistics'], async (t) => {
        const stats = (await t.statistics.get('main')) ?? emptyStatistics();
        if (stats.easterEggsFound.includes(eggId)) return ok(false);
        await t.statistics.put({ ...stats, easterEggsFound: [...stats.easterEggsFound, eggId] });
        return ok(true);
      }),
    );
    if (added.ok && added.value) bus.publish({ type: 'EasterEggFound', eggId });
    return added.ok && added.value;
  }

  /** Marca um capítulo da história como explorado (uma vez) e concede a recompensa de exploração. */
  async recordChapter(chapterId: string, rewardCoins: number): Promise<boolean> {
    const { store, bus } = this.deps;
    const added = await guarded(() =>
      store.transaction(['statistics'], async (t) => {
        const stats = (await t.statistics.get('main')) ?? emptyStatistics();
        if (stats.chaptersExplored.includes(chapterId)) return ok(false);
        await t.statistics.put({
          ...stats,
          chaptersExplored: [...stats.chaptersExplored, chapterId],
        });
        return ok(true);
      }),
    );
    if (added.ok && added.value) {
      await this.economy.grantReward({
        sourceId: rewardSourceId(`chapter:${chapterId}`),
        amount: rewardCoins,
        reason: 'EXPLORATION',
      });
      bus.publish({ type: 'ChapterExplored', chapterId });
    }
    return added.ok && added.value;
  }

  async recordPhotoViewed(): Promise<void> {
    await guarded(() =>
      this.deps.store.transaction(['statistics'], async (t) => {
        const stats = (await t.statistics.get('main')) ?? emptyStatistics();
        await t.statistics.put({ ...stats, photosViewed: stats.photosViewed + 1 });
        return ok(undefined);
      }),
    );
  }

  async evaluate(event: DomainEvent): Promise<AchievementRecord[]> {
    const candidates = this.candidatesFor(event);
    if (candidates.length === 0) return [];
    const stats = await this.deps.store.read(
      ['statistics'],
      async (t) => (await t.statistics.get('main')) ?? emptyStatistics(),
    );
    const inventoryCount = await this.deps.store.read(
      ['inventory'],
      async (t) => (await t.inventory.list()).filter((e) => e.quantity > 0).length,
    );
    const unlocked: AchievementRecord[] = [];
    for (const def of candidates) {
      const progress = this.progressFor(def, event, stats, inventoryCount);
      const rec = await this.upsertProgress(def, progress);
      if (rec) unlocked.push(rec);
    }
    return unlocked;
  }

  private candidatesFor(event: DomainEvent): AchievementDefinition[] {
    const map: Partial<Record<DomainEvent['type'], string[]>> = {
      GameCompleted: ['primeira-partida', 'cacador-de-novelos'],
      ChapterExplored: ['explorador-de-memorias'],
      ItemPurchased: ['primeiro-item', 'colecionador'],
      HouseDecorated: ['decorador'],
      EasterEggFound: ['todos-os-easter-eggs'],
    };
    const ids = map[event.type] ?? [];
    return ACHIEVEMENTS.filter((a) => ids.includes(a.id));
  }

  private progressFor(
    def: AchievementDefinition,
    event: DomainEvent,
    stats: StatisticsRecord,
    inventoryCount: number,
  ): number {
    switch (def.id as string) {
      case 'primeira-partida':
        return stats.gamesPlayed >= 1 ? 1 : 0;
      case 'cacador-de-novelos':
        return stats.capturesByGame['yarn-catcher'] ?? 0;
      case 'explorador-de-memorias':
        return stats.chaptersExplored.length;
      case 'primeiro-item':
        return stats.itemsPurchased >= 1 ? 1 : 0;
      case 'colecionador':
        return inventoryCount;
      case 'decorador':
        return event.type === 'HouseDecorated' && event.itemId ? 1 : 0;
      case 'todos-os-easter-eggs':
        return stats.easterEggsFound.length;
      default:
        return 0;
    }
  }

  /** Grava progresso; desbloqueia uma única vez e concede a recompensa idempotente. */
  async unlockDirect(id: AchievementId): Promise<AchievementRecord | null> {
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (!def) return null;
    return this.upsertProgress(def, def.target ?? 1);
  }

  private async upsertProgress(
    def: AchievementDefinition,
    progress: number,
  ): Promise<AchievementRecord | null> {
    const { store, clock, bus } = this.deps;
    const target = def.target ?? 1;
    const res = await guarded(() =>
      store.transaction(['achievements'], async (t) => {
        const now = clock.now();
        const current = await t.achievements.get(def.id);
        if (current?.unlockedAt) {
          if (current.progress !== Math.max(current.progress, progress)) {
            await t.achievements.put({
              ...current,
              progress: Math.max(current.progress, progress),
            });
          }
          return ok(null);
        }
        const next: AchievementRecord = {
          achievementId: def.id,
          progress: Math.max(current?.progress ?? 0, progress),
          ...(progress >= target ? { unlockedAt: now.toISOString() } : {}),
        };
        await t.achievements.put(next);
        return ok(next.unlockedAt ? next : null);
      }),
    );
    if (!res.ok || !res.value) return null;
    const granted = await this.economy.grantReward({
      sourceId: rewardSourceId(`achievement:${def.id}`),
      amount: def.rewardCoins,
      reason: 'ACHIEVEMENT',
    });
    bus.publish({
      type: 'AchievementUnlocked',
      achievementId: def.id,
      reward: granted.ok && granted.value.granted ? def.rewardCoins : 0,
    });
    return res.value;
  }
}
