import { z } from 'zod';

/** Schemas Zod dos registros persistidos (SAD §9.4): validados em toda leitura. */
const iso = z.string().min(10);
const nonNegInt = z.number().int().nonnegative();

export const ProfileSchema = z.object({
  id: z.literal('main'),
  createdAt: iso,
  schemaVersion: z.number().int().positive(),
});
export const WalletSchema = z.object({ id: z.literal('main'), balance: nonNegInt, updatedAt: iso });
export const SessionSchema = z.object({
  id: z.string().min(1),
  gameId: z.string().min(1),
  status: z.enum(['ACTIVE', 'COMPLETED', 'FAILED', 'ABANDONED']),
  hearts: nonNegInt,
  maxHearts: z.number().int().positive(),
  score: nonNegInt,
  startedAt: iso,
  endedAt: iso.optional(),
  resultSubmitted: z.boolean(),
  rewardGranted: nonNegInt.optional(),
  outcome: z.enum(['WIN', 'LOSS', 'DRAW']).optional(),
});
export const InventoryEntrySchema = z.object({
  itemId: z.string().min(1),
  quantity: nonNegInt,
  acquiredAt: iso,
  consumed: nonNegInt,
});
export const PurchaseSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
  quantity: z.number().int().positive(),
  pricePaid: nonNegInt,
  balanceAfter: nonNegInt,
  purchasedAt: iso,
});
export const RewardClaimSchema = z.object({
  id: z.string().min(1),
  amount: nonNegInt,
  reason: z.enum(['GAME_COMPLETION', 'ACHIEVEMENT', 'FIRST_VISIT', 'SPECIAL_EVENT', 'EXPLORATION']),
  claimedAt: iso,
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export const AchievementRecordSchema = z.object({
  achievementId: z.string().min(1),
  progress: nonNegInt,
  unlockedAt: iso.optional(),
});
export const StatisticsSchema = z.object({
  id: z.literal('main'),
  gamesPlayed: nonNegInt,
  gamesWon: nonNegInt,
  totalCoinsEarned: nonNegInt,
  totalCoinsSpent: nonNegInt,
  itemsPurchased: nonNegInt,
  heartsLost: nonNegInt,
  bestScores: z.record(z.string(), nonNegInt),
  capturesByGame: z.record(z.string(), nonNegInt),
  photosViewed: nonNegInt,
  easterEggsFound: z.array(z.string()),
  chaptersExplored: z.array(z.string()),
  lastPlayedAt: iso.optional(),
});
export const CustomizationSchema = z.object({
  id: z.literal('main'),
  equipped: z.partialRecord(z.enum(['BODY', 'HEAD', 'NECK', 'SCENE']), z.string()),
  updatedAt: iso,
});
export const HouseSchema = z.object({
  id: z.literal('main'),
  placements: z.array(z.object({ slotId: z.string(), itemId: z.string() })),
  updatedAt: iso,
});

export const TABLE_SCHEMAS = {
  profiles: ProfileSchema,
  wallet: WalletSchema,
  sessions: SessionSchema,
  inventory: InventoryEntrySchema,
  purchases: PurchaseSchema,
  rewardClaims: RewardClaimSchema,
  achievements: AchievementRecordSchema,
  statistics: StatisticsSchema,
  customization: CustomizationSchema,
  house: HouseSchema,
} as const;

export const TABLE_KEYS = {
  profiles: 'id',
  wallet: 'id',
  sessions: 'id',
  inventory: 'itemId',
  purchases: 'id',
  rewardClaims: 'id',
  achievements: 'achievementId',
  statistics: 'id',
  customization: 'id',
  house: 'id',
} as const;

export const SCHEMA_VERSION = 1;
