import {
  loadPreferences,
  PREFERENCES_EVENT,
  type Preferences,
} from '@/features/preferences/preferences';

export type SoundName =
  | 'capture'
  | 'miss'
  | 'heart'
  | 'win'
  | 'lose'
  | 'click'
  | 'purchase'
  | 'achievement'
  | 'meow'
  | 'meowSleepy'
  | 'purr'
  | 'scratch'
  | 'chirp';

interface Note {
  freq: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
  delay?: number;
}

/**
 * Voz da Cleo: gravações de gato recortadas (mono, −18 LUFS, ~50 KB no total),
 * em `public/audio/cleo/`. Carregadas só depois do primeiro gesto e com o som
 * ligado. Mais de um arquivo por nome = variação alternada.
 * Efeitos de interface continuam sintetizados (chiptune), combinando com a pixel art.
 */
export const SAMPLES: Partial<Record<SoundName, string[]>> = {
  meow: ['meow', 'meow-2'],
  meowSleepy: ['meow-sleepy'],
  purr: ['purr'],
  scratch: ['scratch'],
  chirp: ['chirp'],
};

/** Efeitos sintetizados; também servem de fallback se uma gravação não carregar. */
const SOUNDS: Record<SoundName, Note[]> = {
  click: [{ freq: 880, dur: 0.04, type: 'square', gain: 0.15 }],
  capture: [
    { freq: 660, dur: 0.07, type: 'square', gain: 0.2 },
    { freq: 990, dur: 0.09, type: 'square', gain: 0.2, delay: 0.06 },
  ],
  miss: [{ freq: 300, dur: 0.15, type: 'triangle', gain: 0.25, slideTo: 200 }],
  heart: [
    { freq: 440, dur: 0.12, type: 'sawtooth', gain: 0.18, slideTo: 220 },
    { freq: 220, dur: 0.18, type: 'sawtooth', gain: 0.15, slideTo: 110, delay: 0.1 },
  ],
  win: [523, 659, 784, 1047].map((f, i) => ({
    freq: f,
    dur: 0.14,
    type: 'square' as const,
    gain: 0.18,
    delay: i * 0.11,
  })),
  lose: [392, 330, 262].map((f, i) => ({
    freq: f,
    dur: 0.2,
    type: 'triangle' as const,
    gain: 0.22,
    delay: i * 0.16,
  })),
  purchase: [
    { freq: 1047, dur: 0.06, type: 'square', gain: 0.15 },
    { freq: 1319, dur: 0.12, type: 'square', gain: 0.15, delay: 0.07 },
  ],
  achievement: [659, 784, 988, 1319].map((f, i) => ({
    freq: f,
    dur: 0.12,
    type: 'triangle' as const,
    gain: 0.22,
    delay: i * 0.08,
  })),
  meow: [
    { freq: 520, dur: 0.12, type: 'sawtooth', gain: 0.12, slideTo: 760 },
    { freq: 760, dur: 0.22, type: 'sawtooth', gain: 0.1, slideTo: 420, delay: 0.11 },
  ],
  meowSleepy: [{ freq: 600, dur: 0.35, type: 'triangle', gain: 0.1, slideTo: 380 }],
  purr: Array.from({ length: 8 }, (_, i) => ({
    freq: 55,
    dur: 0.06,
    type: 'sawtooth' as const,
    gain: 0.12,
    delay: i * 0.07,
  })),
  scratch: Array.from({ length: 4 }, (_, i) => ({
    freq: 1800,
    dur: 0.05,
    type: 'sawtooth' as const,
    gain: 0.06,
    slideTo: 900,
    delay: i * 0.12,
  })),
  chirp: Array.from({ length: 5 }, (_, i) => ({
    freq: 1200,
    dur: 0.04,
    type: 'square' as const,
    gain: 0.08,
    delay: i * 0.06,
  })),
};

class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private unlocked = false;
  private prefs: Preferences = loadPreferences();
  private lastPlayed = new Map<SoundName, number>();
  private buffers = new Map<string, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private baseUrl = '';
  private variant = 0;

  constructor() {
    if (typeof document === 'undefined') return;
    this.baseUrl = (import.meta.env.BASE_URL ?? '').replace(/\/$/, '');
    document.addEventListener(PREFERENCES_EVENT, (e) => {
      this.prefs = (e as CustomEvent<Preferences>).detail;
      this.applyVolume();
      if (!this.prefs.muted && this.unlocked) void this.preload();
    });
    // Nunca inicia áudio antes de um gesto explícito (SAD §11.4 / política de autoplay).
    // Se o gesto já aconteceu antes de este gerenciador existir, o navegador sabe.
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
      .userActivation;
    if (activation?.hasBeenActive) this.unlocked = true;
    const unlock = () => {
      this.unlocked = true;
      void this.ctx?.resume();
      if (!this.prefs.muted) void this.preload();
    };
    for (const ev of ['pointerdown', 'keydown', 'touchstart'] as const) {
      document.addEventListener(ev, unlock, { capture: true, passive: true });
    }
  }

  private ensure(): AudioContext | null {
    if (!this.unlocked) return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.applyVolume();
    }
    return this.ctx;
  }

  private applyVolume(): void {
    if (this.master) this.master.gain.value = this.prefs.muted ? 0 : this.prefs.volume;
  }

  /** Baixa e decodifica as gravações uma única vez (só após gesto e com som ligado). */
  preload(): Promise<void> {
    if (this.loading) return this.loading;
    const ctx = this.ensure();
    if (!ctx) return Promise.resolve();
    const files = [...new Set(Object.values(SAMPLES).flat())];
    this.loading = Promise.all(
      files.map(async (file) => {
        try {
          const res = await fetch(`${this.baseUrl}/audio/cleo/${file}.mp3`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          this.buffers.set(file, await ctx.decodeAudioData(await res.arrayBuffer()));
        } catch (e) {
          // sem a gravação, o efeito sintetizado assume: som nunca é essencial
          console.warn('[audio] gravação indisponível:', file, e);
        }
      }),
    ).then(() => undefined);
    return this.loading;
  }

  private playSample(name: SoundName, ctx: AudioContext, master: GainNode): boolean {
    const files = SAMPLES[name];
    if (!files?.length) return false;
    const file = files[this.variant++ % files.length]!;
    const buffer = this.buffers.get(file);
    if (!buffer) return false;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    // leve variação de afinação: a Cleo não mia sempre igual
    src.playbackRate.value = 0.94 + Math.random() * 0.12;
    src.connect(master);
    src.start();
    return true;
  }

  play(name: SoundName): void {
    if (this.prefs.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    // evita empilhar o mesmo efeito disparado em rajada
    const now = ctx.currentTime;
    const gap = SAMPLES[name] ? 0.35 : 0.05;
    if (now - (this.lastPlayed.get(name) ?? -1) < gap) return;
    this.lastPlayed.set(name, now);
    if (this.playSample(name, ctx, this.master)) return;
    if (SAMPLES[name]) void this.preload();
    for (const n of SOUNDS[name]) {
      const t0 = now + (n.delay ?? 0);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = n.type ?? 'square';
      osc.frequency.setValueAtTime(n.freq, t0);
      if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, t0 + n.dur);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(n.gain ?? 0.2, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
      osc.connect(g).connect(this.master);
      osc.start(t0);
      osc.stop(t0 + n.dur + 0.02);
    }
  }

  /** Para tudo (ao sair de um minigame). */
  stopAll(): void {
    if (!this.ctx) return;
    void this.ctx.close();
    this.ctx = null;
    this.master = null;
    this.buffers.clear(); // buffers pertencem ao contexto fechado
    this.loading = null;
  }

  get isUnlocked(): boolean {
    return this.unlocked;
  }
}

let instance: AudioManager | null = null;
export function audio(): AudioManager {
  instance ??= new AudioManager();
  return instance;
}
