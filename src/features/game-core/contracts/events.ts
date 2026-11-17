import type { AchievementId, GameId, ItemId, RewardSourceId, SessionId } from './ids';
import type { Outcome } from './entities';

/** Eventos de domínio (SAD §10.1). Publicados somente após persistência. */
export type DomainEvent =
  | { type: 'SessionStarted'; sessionId: SessionId; gameId: GameId }
  | { type: 'HeartLost'; sessionId: SessionId; gameId: GameId; remaining: number }
  | {
      type: 'GameCompleted';
      sessionId: SessionId;
      gameId: GameId;
      score: number;
      outcome: Outcome;
      reward: number;
    }
  | { type: 'GameFailed'; sessionId: SessionId; gameId: GameId }
  | { type: 'RewardGranted'; sourceId: RewardSourceId; amount: number; balance: number }
  | { type: 'ItemPurchased'; itemId: ItemId; quantity: number; balance: number }
  | { type: 'ItemEquipped'; itemId: ItemId; slot: string }
  | { type: 'ItemUnequipped'; slot: string }
  | { type: 'ItemConsumed'; itemId: ItemId; remaining: number }
  | { type: 'AchievementUnlocked'; achievementId: AchievementId; reward: number }
  | { type: 'HouseDecorated'; slotId: string; itemId: ItemId | null }
  | { type: 'EasterEggFound'; eggId: string }
  | { type: 'ChapterExplored'; chapterId: string }
  | { type: 'ProgressReset' };

export type DomainEventType = DomainEvent['type'];
export type EventOf<T extends DomainEventType> = Extract<DomainEvent, { type: T }>;
