import { audio } from '@/features/audio/audio-manager';

describe('AudioManager', () => {
  it('não cria AudioContext antes de um gesto do usuário', () => {
    const spy = vi.fn();
    (window as unknown as { AudioContext: unknown }).AudioContext = spy;
    audio().play('click');
    expect(spy).not.toHaveBeenCalled();
    expect(audio().isUnlocked).toBe(false);
  });
});

describe('gravações da Cleo', () => {
  it('todo arquivo mapeado existe em public/audio/cleo e é pequeno', async () => {
    const { SAMPLES } = await import('@/features/audio/audio-manager');
    const { existsSync, statSync } = await import('node:fs');
    const files = [...new Set(Object.values(SAMPLES).flat())];
    expect(files.length).toBeGreaterThanOrEqual(5);
    for (const f of files) {
      const p = `public/audio/cleo/${f}.mp3`;
      expect(existsSync(p), p).toBe(true);
      expect(statSync(p).size).toBeLessThan(30 * 1024);
    }
  });
});
