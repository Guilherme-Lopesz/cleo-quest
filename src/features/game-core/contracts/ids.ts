export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type PlayerId = Brand<string, 'PlayerId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type GameId = Brand<string, 'GameId'>;
export type ItemId = Brand<string, 'ItemId'>;
export type RewardSourceId = Brand<string, 'RewardSourceId'>;
export type AchievementId = Brand<string, 'AchievementId'>;

export type Coins = Brand<number, 'Coins'>;

export const gameId = (s: string): GameId => s as GameId;
export const itemId = (s: string): ItemId => s as ItemId;
export const sessionId = (s: string): SessionId => s as SessionId;
export const rewardSourceId = (s: string): RewardSourceId => s as RewardSourceId;
export const achievementId = (s: string): AchievementId => s as AchievementId;
export const coins = (n: number): Coins => {
  if (!Number.isInteger(n) || n < 0)
    throw new RangeError(`Coins deve ser inteiro não negativo: ${n}`);
  return n as Coins;
};
