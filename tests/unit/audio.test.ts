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
