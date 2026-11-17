import { GAME_CONFIGS, GAME_IDS } from '@core/config/games';
import { calculateReward } from '@core/domain/reward-policy';
import { validateResult } from '@core/domain/result-validation';

const yarn = GAME_CONFIGS[GAME_IDS.yarn]!;
const memory = GAME_CONFIGS[GAME_IDS.memory]!;

describe('RewardPolicy', () => {
  it('participação mínima mesmo com zero pontos', () => {
    expect(calculateReward(yarn, { score: 0, outcome: 'LOSS', durationMs: 5000 })).toBe(5);
  });
  it('cresce com a pontuação e ganha bônus de vitória', () => {
    expect(calculateReward(yarn, { score: 50, outcome: 'LOSS', durationMs: 5000 })).toBe(15);
    expect(calculateReward(yarn, { score: 50, outcome: 'WIN', durationMs: 5000 })).toBe(20);
  });
  it('respeita o teto por partida (reward = min(calc, max))', () => {
    expect(calculateReward(yarn, { score: 500, outcome: 'WIN', durationMs: 5000 })).toBe(30);
    expect(calculateReward(memory, { score: 300, outcome: 'WIN', durationMs: 5000 })).toBe(35);
  });
  it('faixas do Mestre: novelo 5–30, memória 15–35', () => {
    expect(calculateReward(memory, { score: 0, outcome: 'LOSS', durationMs: 5000 })).toBe(15);
  });
});

describe('validateResult', () => {
  const base = { score: 10, outcome: 'WIN' as const, durationMs: 5000 };
  it('aceita resultado plausível', () => expect(validateResult(yarn, base).ok).toBe(true));
  it('rejeita score acima do limite, negativo ou não inteiro', () => {
    expect(validateResult(yarn, { ...base, score: 501 }).ok).toBe(false);
    expect(validateResult(yarn, { ...base, score: -1 }).ok).toBe(false);
    expect(validateResult(yarn, { ...base, score: 1.5 }).ok).toBe(false);
  });
  it('rejeita duração implausível', () => {
    expect(validateResult(yarn, { ...base, durationMs: 10 }).ok).toBe(false);
    expect(validateResult(yarn, { ...base, durationMs: 60 * 60 * 1000 }).ok).toBe(false);
  });
});
