import type { AchievementId, Coins, GameId, ItemId, RewardSourceId, SessionId } from './ids';

export interface PlayerProfile {
  id: 'main';
  createdAt: string;
  schemaVersion: number;
}

export interface Wallet {
  id: 'main';
  balance: Coins;
  updatedAt: string;
}

export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'ABANDONED';
export type Outcome = 'WIN' | 'LOSS' | 'DRAW';

export interface GameSession {
  id: SessionId;
  gameId: GameId;
  status: SessionStatus;
  hearts: number;
  maxHearts: number;
  score: number;
  startedAt: string;
  endedAt?: string;
  /** Resultado já processado (recompensa calculada uma única vez). */
  resultSubmitted: boolean;
  rewardGranted?: number;
  outcome?: Outcome;
}

export interface GameResultInput {
  score: number;
  outcome: Outcome;
  durationMs: number;
  metrics?: Record<string, number>;
}

export type ItemCategory = 'FOOD' | 'TOY' | 'BOWL' | 'DECORATION' | 'OUTFIT' | 'SPECIAL';
/** Comportamento do item (Mestre §5.5). */
export type ItemKind = 'COSMETIC' | 'TOY' | 'CONSUMABLE' | 'FURNITURE' | 'COLLECTIBLE';
export type EquipSlot = 'BODY' | 'HEAD' | 'NECK' | 'SCENE';
export type HouseRoom = 'quarto' | 'cozinha' | 'brincadeiras' | 'jardim';

export interface CatalogItem {
  id: ItemId;
  name: string;
  description: string;
  category: ItemCategory;
  kind: ItemKind;
  price: number;
  image: string;
  enabled: boolean;
  stackable: boolean;
  maxQuantity?: number;
  equipSlot?: EquipSlot;
  /** Camada de sprite aplicada quando equipado (cosméticos). */
  spriteLayer?: 'vest' | 'crown' | 'hat' | 'bow' | 'tie';
  /** Cômodo onde pode ser colocado (móveis). */
  room?: HouseRoom;
  /** Interação liberada na casinha. */
  interaction?: 'sleep' | 'play' | 'eat' | 'drink' | 'scratch';
}

export interface InventoryEntry {
  itemId: ItemId;
  quantity: number;
  acquiredAt: string;
  consumed: number;
}

export interface PurchaseReceipt {
  id: string;
  itemId: ItemId;
  quantity: number;
  pricePaid: number;
  balanceAfter: number;
  purchasedAt: string;
}

export type RewardReason =
  'GAME_COMPLETION' | 'ACHIEVEMENT' | 'FIRST_VISIT' | 'SPECIAL_EVENT' | 'EXPLORATION';

export interface RewardClaimRecord {
  /** = sourceId; chave de idempotência. */
  id: RewardSourceId;
  amount: number;
  reason: RewardReason;
  claimedAt: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  description: string;
  rewardCoins: number;
  unique: boolean;
  /** Para conquistas cumulativas: meta a atingir. */
  target?: number;
  icon: string;
  secret?: boolean;
}

export interface AchievementRecord {
  achievementId: AchievementId;
  progress: number;
  unlockedAt?: string;
}

export interface StatisticsRecord {
  id: 'main';
  gamesPlayed: number;
  gamesWon: number;
  totalCoinsEarned: number;
  totalCoinsSpent: number;
  itemsPurchased: number;
  heartsLost: number;
  bestScores: Record<string, number>;
  capturesByGame: Record<string, number>;
  photosViewed: number;
  easterEggsFound: string[];
  chaptersExplored: string[];
  lastPlayedAt?: string;
}

export interface CustomizationRecord {
  id: 'main';
  equipped: Partial<Record<EquipSlot, ItemId>>;
  updatedAt: string;
}

export interface HousePlacement {
  slotId: string;
  itemId: ItemId;
}

export interface HouseRecord {
  id: 'main';
  placements: HousePlacement[];
  updatedAt: string;
}
