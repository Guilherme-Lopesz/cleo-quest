import type { GameSession, StatisticsRecord } from '../contracts';

export function emptyStatistics(): StatisticsRecord {
  return {
    id: 'main',
    gamesPlayed: 0,
    gamesWon: 0,
    totalCoinsEarned: 0,
    totalCoinsSpent: 0,
    itemsPurchased: 0,
    heartsLost: 0,
    bestScores: {},
    capturesByGame: {},
    photosViewed: 0,
    easterEggsFound: [],
    chaptersExplored: [],
  };
}

export function afterSession(
  stats: StatisticsRecord,
  session: GameSession,
  captures: number,
): StatisticsRecord {
  const best = stats.bestScores[session.gameId] ?? 0;
  return {
    ...stats,
    gamesPlayed: stats.gamesPlayed + 1,
    gamesWon: stats.gamesWon + (session.outcome === 'WIN' ? 1 : 0),
    totalCoinsEarned: stats.totalCoinsEarned + (session.rewardGranted ?? 0),
    bestScores: { ...stats.bestScores, [session.gameId]: Math.max(best, session.score) },
    capturesByGame: {
      ...stats.capturesByGame,
      [session.gameId]: (stats.capturesByGame[session.gameId] ?? 0) + captures,
    },
    ...((session.endedAt ?? stats.lastPlayedAt)
      ? { lastPlayedAt: session.endedAt ?? stats.lastPlayedAt }
      : {}),
  };
}

export function afterPurchase(
  stats: StatisticsRecord,
  pricePaid: number,
  quantity: number,
): StatisticsRecord {
  return {
    ...stats,
    totalCoinsSpent: stats.totalCoinsSpent + pricePaid,
    itemsPurchased: stats.itemsPurchased + quantity,
  };
}

export function afterReward(stats: StatisticsRecord, amount: number): StatisticsRecord {
  return { ...stats, totalCoinsEarned: stats.totalCoinsEarned + amount };
}
