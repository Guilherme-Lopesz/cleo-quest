import type { Clock, IdGenerator, ProgressStore } from '../contracts';
import { systemClock } from '../contracts';
import { createCatalog } from '../config/catalog';
import { AchievementService } from './achievement-service';
import { defaultIds, type Catalog, type CoreDeps } from './deps';
import { EconomyService } from './economy-service';
import { EventBus } from './event-bus';
import { HouseService } from './house-service';
import { InventoryService } from './inventory-service';
import { ProgressService } from './progress-service';
import { SessionService } from './session-service';
import { ShopService } from './shop-service';
import { createStore, initialUiState, type GameUiState, type Store } from './store';

export interface GameCoreOptions {
  store: ProgressStore;
  clock?: Clock;
  ids?: IdGenerator;
  catalog?: Catalog;
  bus?: EventBus;
  /** Liga a avaliação automática de conquistas ao Event Bus (padrão: sim). */
  achievements?: boolean;
}

/** Raiz de composição do Game Core: serviços, Event Bus e estado reativo de UI. */
export class GameCore {
  readonly bus: EventBus;
  readonly ui: Store<GameUiState>;
  readonly economy: EconomyService;
  readonly sessions: SessionService;
  readonly shop: ShopService;
  readonly inventory: InventoryService;
  readonly house: HouseService;
  readonly achievements: AchievementService;
  readonly progress: ProgressService;
  readonly catalog: Catalog;
  private detachAchievements: (() => void) | null = null;
  private readonly autoAchievements: boolean;

  constructor(options: GameCoreOptions) {
    this.bus = options.bus ?? new EventBus();
    this.autoAchievements = options.achievements ?? true;
    this.catalog = options.catalog ?? createCatalog();
    const deps: CoreDeps = {
      store: options.store,
      bus: this.bus,
      clock: options.clock ?? systemClock,
      ids: options.ids ?? defaultIds,
      catalog: this.catalog,
    };
    this.ui = createStore(initialUiState);
    this.economy = new EconomyService(deps);
    this.sessions = new SessionService(deps);
    this.shop = new ShopService(deps);
    this.inventory = new InventoryService(deps);
    this.house = new HouseService(deps);
    this.achievements = new AchievementService(deps, this.economy);
    this.progress = new ProgressService(deps);
  }

  /**
   * Inicialização: perfil, bônus de boas-vindas (idempotente), listeners de
   * conquistas e sincronização do estado de UI com o banco.
   */
  async init(): Promise<void> {
    this.detachAchievements?.();
    if (this.autoAchievements) this.detachAchievements = this.achievements.attach();
    const profile = await this.progress.ensureProfile();
    if (!profile.ok) {
      this.ui.set({
        ready: true,
        storageStatus: profile.error.code === 'VALIDATION_FAILURE' ? 'corrupt' : 'unavailable',
        lastError: profile.error.message,
      });
      return;
    }
    await this.economy.grantWelcomeBonus();
    await this.refreshUi();
    this.bus.onAny(() => void this.refreshUi());
    this.ui.set({ ready: true });
  }

  async refreshUi(): Promise<void> {
    try {
      const [balance, active, inventory, customization] = await Promise.all([
        this.economy.getBalance(),
        this.sessions.getActive(),
        this.inventory.list(),
        this.inventory.getCustomization(),
      ]);
      this.ui.set({
        balance,
        activeSessionId: active?.id ?? null,
        hearts: active?.hearts ?? 0,
        maxHearts: active?.maxHearts ?? 5,
        ownedCount: inventory.filter((e) => e.quantity > 0).length,
        equipped: customization.equipped,
        storageStatus: 'ok',
        lastError: null,
      });
    } catch (e) {
      this.ui.set({
        storageStatus: 'unavailable',
        lastError: e instanceof Error ? e.message : String(e),
      });
    }
  }

  destroy(): void {
    this.detachAchievements?.();
    this.bus.clear();
  }
}
