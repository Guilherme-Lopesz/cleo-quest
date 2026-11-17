import Dexie, { type Table } from 'dexie';
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
} from '@core/contracts';

export const DB_NAME = 'cleo-quest';

/**
 * Esquema Dexie (SAD §9.2). Toda mudança incompatível incrementa a versão e
 * ganha um `.upgrade()` determinístico testado com fixture da versão anterior.
 * Índices refletem as consultas reais: sessões por status; recibos por item/data.
 */
export class CleoDatabase extends Dexie {
  profiles!: Table<PlayerProfile, string>;
  wallet!: Table<Wallet, string>;
  sessions!: Table<GameSession, string>;
  inventory!: Table<InventoryEntry, string>;
  purchases!: Table<PurchaseReceipt, string>;
  rewardClaims!: Table<RewardClaimRecord, string>;
  achievements!: Table<AchievementRecord, string>;
  statistics!: Table<StatisticsRecord, string>;
  customization!: Table<CustomizationRecord, string>;
  house!: Table<HouseRecord, string>;

  constructor(name = DB_NAME) {
    super(name);
    this.version(1).stores({
      profiles: 'id',
      wallet: 'id',
      sessions: 'id, status, startedAt',
      inventory: 'itemId',
      purchases: 'id, itemId, purchasedAt',
      rewardClaims: 'id, claimedAt',
      achievements: 'achievementId',
      statistics: 'id',
      customization: 'id',
      house: 'id',
    });
  }
}
