import type { GameConfig, Outcome } from '../contracts';

export interface RewardInput {
  score: number;
  outcome: Outcome;
  durationMs: number;
}

/**
 * Política central de recompensa (SAD §7.2). O minigame nunca informa o valor;
 * o Core calcula a partir da configuração do jogo e aplica o teto por partida.
 */
export function calculateReward(config: GameConfig, input: RewardInput): number {
  const { participation, perScore, winBonus, maxPerSession } = config.reward;
  const base = participation + Math.floor(Math.max(0, input.score) * perScore);
  const bonus = input.outcome === 'WIN' ? winBonus : 0;
  return Math.max(0, Math.min(base + bonus, maxPerSession));
}
