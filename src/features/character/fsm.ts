import { CLEO_SPRITES } from './manifest.generated';

/**
 * Máquina de estados da Cleo (Mestre §7.2). Pura e determinística: recebe
 * tempo e eventos, devolve animação/posição. Não toca o DOM — o walker faz isso.
 */
export type CharacterState =
  | 'idle'
  | 'walking'
  | 'sitting'
  | 'sleeping'
  | 'blink'
  | 'scratch'
  | 'happy'
  | 'angry'
  | 'eating'
  | 'playing'
  | 'surprised'
  | 'sad';

export type AnimationName = keyof typeof CLEO_SPRITES.animations;

export type CharacterInput =
  | { type: 'tick'; dt: number }
  | { type: 'pet' }
  | { type: 'navigate' }
  | { type: 'use'; kind: 'consumable' | 'toy' }
  | { type: 'react'; reaction: 'surprised' | 'sad' | 'angry' | 'happy' | 'scratch' }
  | { type: 'wake' };

export interface CharacterSnapshot {
  state: CharacterState;
  animation: AnimationName;
  frame: number;
  x: number;
  facing: 1 | -1;
  mood: 'content' | 'annoyed' | 'sleepy';
}

export interface CharacterOptions {
  /** Largura do trajeto, em px (a Cleo anda de 0 até aqui). */
  rangeWidth: number;
  speed: number; // px por segundo
  idleToSitMs: number;
  sitToSleepMs: number;
  walkEveryMs: number;
  reducedMotion: boolean;
  random: () => number;
}

export const defaultCharacterOptions: CharacterOptions = {
  rangeWidth: 320,
  speed: 48,
  idleToSitMs: 8_000,
  sitToSleepMs: 20_000,
  walkEveryMs: 6_000,
  reducedMotion: false,
  random: Math.random,
};

const ONE_SHOT: ReadonlySet<CharacterState> = new Set([
  'blink',
  'scratch',
  'happy',
  'angry',
  'eating',
  'playing',
  'surprised',
  'sad',
]);

const ANIM_FOR: Record<CharacterState, AnimationName> = {
  idle: 'idle',
  walking: 'walk',
  sitting: 'sitting',
  sleeping: 'sleeping',
  blink: 'blink',
  scratch: 'scratch',
  happy: 'happy',
  angry: 'angry',
  eating: 'eating',
  playing: 'playing',
  surprised: 'surprised',
  sad: 'sad',
};

export class CharacterFsm {
  private state: CharacterState = 'idle';
  private stateMs = 0; // tempo no estado atual
  private clockMs = 0; // tempo total
  private frameMs = 0;
  private frame = 0;
  private x: number;
  private facing: 1 | -1 = 1;
  private target = 0;
  private sinceWalk = 0;
  private petCount = 0;
  private lastPetMs: number | null = null;
  private returnTo: CharacterState = 'idle';
  private readonly opts: CharacterOptions;

  constructor(options: Partial<CharacterOptions> = {}) {
    this.opts = { ...defaultCharacterOptions, ...options };
    this.x = Math.floor(this.opts.rangeWidth * 0.3);
  }

  get snapshot(): CharacterSnapshot {
    const mood = this.state === 'sleeping' ? 'sleepy' : this.petCount >= 4 ? 'annoyed' : 'content';
    return {
      state: this.state,
      animation: ANIM_FOR[this.state],
      frame: this.frame,
      x: this.x,
      facing: this.facing,
      mood,
    };
  }

  setRange(width: number): void {
    this.opts.rangeWidth = Math.max(0, width);
    this.x = Math.min(this.x, this.opts.rangeWidth);
    this.target = Math.min(this.target, this.opts.rangeWidth);
  }

  dispatch(input: CharacterInput): void {
    switch (input.type) {
      case 'tick':
        this.tick(input.dt);
        return;
      case 'pet':
        this.onPet();
        return;
      case 'navigate':
        if (this.state === 'sleeping' || this.state === 'sitting') this.enter('idle');
        else if (this.state === 'idle') this.startWalk();
        return;
      case 'use':
        this.enter(input.kind === 'consumable' ? 'eating' : 'playing');
        return;
      case 'react':
        this.enter(input.reaction);
        return;
      case 'wake':
        if (this.state === 'sleeping') this.enter('idle');
        return;
    }
  }

  private onPet(): void {
    const now = this.clockMs;
    // cliques repetidos em sequência irritam a Cleo (Mestre §7.3)
    this.petCount = this.lastPetMs !== null && now - this.lastPetMs < 1_500 ? this.petCount + 1 : 1;
    this.lastPetMs = now;
    if (this.state === 'sleeping') {
      this.enter('surprised');
      return;
    }
    if (this.petCount >= 5) {
      this.petCount = 0;
      this.enter('angry');
      return;
    }
    if (this.petCount >= 3) {
      this.enter('scratch');
      return;
    }
    this.enter('happy');
  }

  private startWalk(): void {
    if (this.opts.reducedMotion || this.opts.rangeWidth <= 0) return;
    const w = this.opts.rangeWidth;
    let t = Math.floor(this.opts.random() * w);
    if (Math.abs(t - this.x) < w * 0.25) t = this.x < w / 2 ? w - 8 : 8;
    this.target = Math.max(0, Math.min(w, t));
    this.facing = this.target >= this.x ? 1 : -1;
    this.enter('walking');
  }

  private enter(next: CharacterState): void {
    if (ONE_SHOT.has(next) && !ONE_SHOT.has(this.state)) {
      this.returnTo = this.state === 'walking' ? 'idle' : this.state;
    }
    if (this.state !== 'walking' && this.state !== 'idle' && next === 'idle') this.sinceWalk = 0;
    this.state = next;
    this.stateMs = 0;
    this.frameMs = 0;
    this.frame = 0;
  }

  private tick(dt: number): void {
    this.stateMs += dt;
    this.clockMs += dt;
    this.sinceWalk += dt;
    const anim = CLEO_SPRITES.animations[ANIM_FOR[this.state]];
    const frameDuration = 1000 / anim.fps;
    this.frameMs += dt;
    while (this.frameMs >= frameDuration) {
      this.frameMs -= frameDuration;
      this.frame += 1;
      if (this.frame >= anim.frames) {
        if (anim.loop) this.frame = 0;
        else {
          this.frame = anim.frames - 1;
          this.finishOneShot();
          return;
        }
      }
    }
    switch (this.state) {
      case 'walking': {
        const step = (this.opts.speed * dt) / 1000;
        if (Math.abs(this.target - this.x) <= step) {
          this.x = this.target;
          this.sinceWalk = 0;
          this.enter('idle');
        } else {
          this.x += step * this.facing;
        }
        break;
      }
      case 'idle':
        if (
          !this.opts.reducedMotion &&
          this.sinceWalk >= this.opts.walkEveryMs &&
          this.opts.random() < 0.5
        ) {
          this.startWalk();
        } else if (this.stateMs >= this.opts.idleToSitMs) {
          this.enter('sitting');
        } else if (this.stateMs > 2_000 && this.opts.random() < 0.004) {
          this.enter('blink');
        }
        break;
      case 'sitting':
        if (this.stateMs >= this.opts.sitToSleepMs) this.enter('sleeping');
        break;
      default:
        break;
    }
  }

  private finishOneShot(): void {
    if (this.state === 'blink') {
      this.state = 'idle';
      this.frameMs = 0;
      this.frame = 0;
      return; // piscar não reinicia o relógio de inatividade
    }
    const back = this.returnTo === 'sleeping' ? 'idle' : this.returnTo;
    this.enter(back);
  }
}
