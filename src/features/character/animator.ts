import { CLEO_SPRITES } from './manifest.generated';
import type { SpriteView } from './sprite-view';

type AnimName = keyof typeof CLEO_SPRITES.animations;

/** Toca animações em um SpriteView fora da FSM (prévias, casinha, loja). */
export class SpriteAnimator {
  private raf = 0;
  private current: AnimName = 'idle';
  private frame = 0;
  private acc = 0;
  private last = 0;
  private onDone: (() => void) | null = null;
  private running = false;

  constructor(
    private readonly view: SpriteView,
    private readonly reducedMotion = false,
  ) {}

  play(name: AnimName, onDone?: () => void): void {
    this.current = name;
    this.frame = 0;
    this.acc = 0;
    this.onDone = onDone ?? null;
    this.view.setFrame(name, 0);
    if (this.reducedMotion) {
      // sem animação contínua: mostra um frame representativo e conclui
      const anim = CLEO_SPRITES.animations[name];
      this.view.setFrame(name, Math.min(1, anim.frames - 1));
      if (!anim.loop) setTimeout(() => this.finish(), 600);
      return;
    }
    this.start();
  }

  private start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(100, now - this.last);
      this.last = now;
      const anim = CLEO_SPRITES.animations[this.current];
      this.acc += dt;
      const per = 1000 / anim.fps;
      while (this.acc >= per) {
        this.acc -= per;
        this.frame += 1;
        if (this.frame >= anim.frames) {
          if (anim.loop) this.frame = 0;
          else {
            this.frame = anim.frames - 1;
            this.view.setFrame(this.current, this.frame);
            this.finish();
            return;
          }
        }
      }
      this.view.setFrame(this.current, this.frame);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private finish(): void {
    const cb = this.onDone;
    this.onDone = null;
    this.stop();
    cb?.();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
