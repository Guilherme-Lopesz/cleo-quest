import { gameId, type GameConfig, type GameId } from '../contracts';

/**
 * Configuração por minigame (SAD §18, faixas do Mestre §5.2):
 * Pegue o Novelo 5–30 · Pescaria 10–40 · Memória Felina 15–35.
 * reward = min(participation + floor(score * perScore) + winBonus(se WIN), maxPerSession)
 */
export const GAME_IDS = {
  yarn: gameId('yarn-catcher'),
  fishing: gameId('fishing'),
  memory: gameId('cat-memory'),
} as const;

export const GAME_CONFIGS: Record<string, GameConfig> = {
  [GAME_IDS.yarn]: {
    gameId: GAME_IDS.yarn,
    maxHearts: 5,
    reward: { participation: 5, perScore: 0.2, winBonus: 5, maxPerSession: 30 },
    limits: { minDurationMs: 1_000, maxDurationMs: 10 * 60 * 1000, maxScore: 500 },
  },
  [GAME_IDS.fishing]: {
    gameId: GAME_IDS.fishing,
    maxHearts: 5,
    reward: { participation: 10, perScore: 0.25, winBonus: 5, maxPerSession: 40 },
    limits: { minDurationMs: 1_000, maxDurationMs: 10 * 60 * 1000, maxScore: 400 },
  },
  [GAME_IDS.memory]: {
    gameId: GAME_IDS.memory,
    maxHearts: 5,
    reward: { participation: 15, perScore: 0.1, winBonus: 10, maxPerSession: 35 },
    limits: { minDurationMs: 2_000, maxDurationMs: 15 * 60 * 1000, maxScore: 300 },
  },
};

export function gameConfig(id: GameId): GameConfig | undefined {
  return GAME_CONFIGS[id];
}
