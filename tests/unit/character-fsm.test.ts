import { CharacterFsm } from '@/features/character/fsm';

const seq = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
};

describe('CharacterFsm', () => {
  it('começa em idle e senta após inatividade, depois dorme', () => {
    const fsm = new CharacterFsm({
      idleToSitMs: 1000,
      sitToSleepMs: 1000,
      walkEveryMs: 99_999,
      random: () => 0.9,
    });
    fsm.dispatch({ type: 'tick', dt: 999 });
    expect(fsm.snapshot.state).toBe('idle');
    fsm.dispatch({ type: 'tick', dt: 2 });
    expect(fsm.snapshot.state).toBe('sitting');
    fsm.dispatch({ type: 'tick', dt: 1001 });
    expect(fsm.snapshot.state).toBe('sleeping');
    expect(fsm.snapshot.animation).toBe('sleeping');
  });

  it('carinho deixa feliz e volta para o estado anterior', () => {
    const fsm = new CharacterFsm({ random: () => 0.9 });
    fsm.dispatch({ type: 'pet' });
    expect(fsm.snapshot.state).toBe('happy');
    // animação happy: 4 frames a 6fps ≈ 667ms
    fsm.dispatch({ type: 'tick', dt: 800 });
    expect(fsm.snapshot.state).toBe('idle');
  });

  it('cliques repetidos levam a arranhar e depois ficar brava', () => {
    const fsm = new CharacterFsm({ random: () => 0.9 });
    fsm.dispatch({ type: 'pet' });
    fsm.dispatch({ type: 'tick', dt: 100 });
    fsm.dispatch({ type: 'pet' });
    fsm.dispatch({ type: 'tick', dt: 100 });
    fsm.dispatch({ type: 'pet' });
    expect(fsm.snapshot.state).toBe('scratch');
    fsm.dispatch({ type: 'tick', dt: 100 });
    fsm.dispatch({ type: 'pet' });
    fsm.dispatch({ type: 'tick', dt: 100 });
    fsm.dispatch({ type: 'pet' });
    expect(fsm.snapshot.state).toBe('angry');
  });

  it('nunca anda e dorme ao mesmo tempo; acordar interrompe o sono', () => {
    const fsm = new CharacterFsm({ idleToSitMs: 10, sitToSleepMs: 10, random: () => 0.9 });
    fsm.dispatch({ type: 'tick', dt: 11 });
    fsm.dispatch({ type: 'tick', dt: 11 });
    expect(fsm.snapshot.state).toBe('sleeping');
    fsm.dispatch({ type: 'navigate' });
    expect(fsm.snapshot.state).toBe('idle');
  });

  it('anda até um alvo dentro do intervalo e para em idle', () => {
    const fsm = new CharacterFsm({
      rangeWidth: 200,
      speed: 100,
      walkEveryMs: 99_999,
      random: seq([0.95, 0.1]),
    });
    fsm.dispatch({ type: 'navigate' });
    expect(fsm.snapshot.state).toBe('walking');
    for (let i = 0; i < 40; i++) fsm.dispatch({ type: 'tick', dt: 100 });
    expect(fsm.snapshot.state).toBe('idle');
    expect(fsm.snapshot.x).toBeGreaterThanOrEqual(0);
    expect(fsm.snapshot.x).toBeLessThanOrEqual(200);
  });

  it('com movimento reduzido não caminha', () => {
    const fsm = new CharacterFsm({ reducedMotion: true, walkEveryMs: 0, random: () => 0.9 });
    fsm.dispatch({ type: 'navigate' });
    expect(fsm.snapshot.state).toBe('idle');
  });

  it('usar consumível come; usar brinquedo brinca', () => {
    const fsm = new CharacterFsm();
    fsm.dispatch({ type: 'use', kind: 'consumable' });
    expect(fsm.snapshot.state).toBe('eating');
    fsm.dispatch({ type: 'tick', dt: 2000 });
    fsm.dispatch({ type: 'use', kind: 'toy' });
    expect(fsm.snapshot.state).toBe('playing');
  });
});
