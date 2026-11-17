import { GAME_CONFIGS, GAME_IDS } from '@core/config/games';
import { sessionId } from '@core/contracts';
import {
  abandonSession,
  completeSession,
  createSession,
  loseHeart,
} from '@core/domain/session-rules';

const now = new Date('2026-11-17T03:00:00Z');
const cfg = GAME_CONFIGS[GAME_IDS.yarn]!;

describe('sessão e corações', () => {
  it('começa com o máximo de corações', () => {
    const s = createSession(sessionId('s1'), GAME_IDS.yarn, cfg, now);
    expect(s.hearts).toBe(5);
    expect(s.status).toBe('ACTIVE');
  });

  it('perder corações até zero encerra como FAILED e bloqueia perdas extras', () => {
    let s = createSession(sessionId('s1'), GAME_IDS.yarn, cfg, now);
    for (let i = 0; i < 5; i++) {
      const r = loseHeart(s, now);
      expect(r.ok).toBe(true);
      if (r.ok) s = r.value;
    }
    expect(s.hearts).toBe(0);
    expect(s.status).toBe('FAILED');
    const extra = loseHeart(s, now);
    expect(extra.ok).toBe(false);
    if (!extra.ok) expect(extra.error.code).toBe('SESSION_NOT_ACTIVE');
  });

  it('completa uma única vez; segunda tentativa é REWARD_ALREADY_CLAIMED', () => {
    const s = createSession(sessionId('s1'), GAME_IDS.yarn, cfg, now);
    const done = completeSession(s, 'WIN', 40, 13, now);
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    expect(done.value.status).toBe('COMPLETED');
    expect(done.value.rewardGranted).toBe(13);
    const again = completeSession(done.value, 'WIN', 40, 13, now);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe('REWARD_ALREADY_CLAIMED');
  });

  it('sessão FAILED por corações ainda aceita o resultado final como LOSS', () => {
    let s = createSession(sessionId('s1'), GAME_IDS.yarn, cfg, now);
    for (let i = 0; i < 5; i++) {
      const r = loseHeart(s, now);
      if (r.ok) s = r.value;
    }
    const done = completeSession(s, 'WIN', 12, 7, now);
    expect(done.ok).toBe(true);
    if (done.ok) {
      expect(done.value.outcome).toBe('LOSS');
      expect(done.value.status).toBe('FAILED');
    }
  });

  it('sessão abandonada não aceita resultado', () => {
    const s = createSession(sessionId('s1'), GAME_IDS.yarn, cfg, now);
    const ab = abandonSession(s, now);
    expect(ab.ok).toBe(true);
    if (ab.ok) expect(completeSession(ab.value, 'WIN', 1, 1, now).ok).toBe(false);
  });
});
