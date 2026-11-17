import type {
  AchievementRecord,
  CustomizationRecord,
  GameSession,
  HouseRecord,
  InventoryEntry,
  PlayerProfile,
  PurchaseReceipt,
  RewardClaimRecord,
  StatisticsRecord,
  Wallet,
} from './entities';

/** Tabela chaveada, visível apenas dentro de uma transação. */
export interface KeyedTable<T, K extends string = string> {
  get(key: K): Promise<T | undefined>;
  put(value: T): Promise<void>;
  delete(key: K): Promise<void>;
  list(): Promise<T[]>;
}

export interface ProgressTables {
  profiles: KeyedTable<PlayerProfile>;
  wallet: KeyedTable<Wallet>;
  sessions: KeyedTable<GameSession>;
  inventory: KeyedTable<InventoryEntry>;
  purchases: KeyedTable<PurchaseReceipt>;
  rewardClaims: KeyedTable<RewardClaimRecord>;
  achievements: KeyedTable<AchievementRecord>;
  statistics: KeyedTable<StatisticsRecord>;
  customization: KeyedTable<CustomizationRecord>;
  house: KeyedTable<HouseRecord>;
}

export type TableName = keyof ProgressTables;

/**
 * Porta de persistência (SAD §9/§11.4). Toda operação roda em `transaction`:
 * se o callback lançar, nada é gravado. A implementação IndexedDB usa Dexie;
 * a de memória serve a testes e a ambientes sem IndexedDB.
 */
export interface ProgressStore {
  transaction<T>(tables: readonly TableName[], fn: (t: ProgressTables) => Promise<T>): Promise<T>;
  read<T>(tables: readonly TableName[], fn: (t: ProgressTables) => Promise<T>): Promise<T>;
  /** Apaga todo o progresso (reset explícito, com confirmação na UI). */
  clear(): Promise<void>;
  /** Exporta o estado completo para backup JSON. */
  exportAll(): Promise<Record<TableName, unknown[]>>;
}

/** Erro de persistência traduzido para o domínio. */
export class PersistenceError extends Error {
  constructor(
    message: string,
    readonly kind: 'UNAVAILABLE' | 'QUOTA' | 'CORRUPT' | 'UNKNOWN',
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'PersistenceError';
  }
}

export interface Clock {
  now(): Date;
}
export const systemClock: Clock = { now: () => new Date() };

export interface IdGenerator {
  next(prefix: string): string;
}
