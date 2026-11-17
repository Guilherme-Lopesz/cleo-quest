import type * as PhaserNS from 'phaser';
import type { GameContext } from '@core/contracts';
import { CLEO_SPRITES } from '@/features/character/manifest.generated';

export const WIDTH = 360;
export const HEIGHT = 560;
const CASTS = 10;
const WIN_CATCHES = 5;

type Phase = 'idle' | 'waiting' | 'bite' | 'resolving' | 'over';
interface FishKind {
  key: string;
  name: string;
  score: number;
  weight: number;
  color: number;
}
const FISH: FishKind[] = [
  { key: 'fish-common', name: 'Peixinho comum', score: 10, weight: 60, color: 0x9fd3e6 },
  { key: 'fish-uncommon', name: 'Peixe listrado', score: 20, weight: 28, color: 0xe4c25a },
  { key: 'fish-rare', name: 'Peixe dourado raro', score: 40, weight: 9, color: 0xf0a04b },
  { key: 'boot', name: 'Uma bota (vale 5)', score: 5, weight: 3, color: 0x786d62 },
];

export interface SceneBridge {
  pause(): void;
  resume(): void;
}

/** Pescaria: espera → sinal → ação no tempo certo. Resultado vai ao Core; a cena nunca gera moedas. */
export function createFishingScene(
  Phaser: typeof PhaserNS,
  ctx: GameContext,
): { scene: PhaserNS.Scene; bridge: SceneBridge } {
  let api: SceneBridge = { pause: () => undefined, resume: () => undefined };

  class FishingScene extends Phaser.Scene {
    private phase: Phase = 'idle';
    private casts = 0;
    private catches = 0;
    private score = 0;
    private bob!: PhaserNS.GameObjects.Arc;
    private line!: PhaserNS.GameObjects.Graphics;
    private alert!: PhaserNS.GameObjects.Text;
    private message!: PhaserNS.GameObjects.Text;
    private base!: PhaserNS.GameObjects.Sprite;
    private vest!: PhaserNS.GameObjects.Sprite;
    private waitTimer?: PhaserNS.Time.TimerEvent;
    private biteTimer?: PhaserNS.Time.TimerEvent;
    private ripples: PhaserNS.GameObjects.Arc[] = [];

    constructor() {
      super('fishing');
    }

    preload(): void {
      const fw = CLEO_SPRITES.frameWidth;
      const fh = CLEO_SPRITES.frameHeight;
      this.load.spritesheet('cleo-base', `${ctx.assetBase}/pixel-art/cleo/base.png`, {
        frameWidth: fw,
        frameHeight: fh,
      });
      this.load.spritesheet('cleo-vest', `${ctx.assetBase}/pixel-art/cleo/vest.png`, {
        frameWidth: fw,
        frameHeight: fh,
      });
    }

    create(): void {
      this.makeTextures();
      // céu, lago e deck
      const bg = this.add.graphics();
      bg.fillGradientStyle(0xf7f3ec, 0xf7f3ec, 0xd6ecf5, 0xd6ecf5, 1);
      bg.fillRect(0, 0, WIDTH, 220);
      bg.fillStyle(0x9fd3e6, 1);
      bg.fillRect(0, 220, WIDTH, HEIGHT - 220);
      bg.fillStyle(0x7fbfd8, 1);
      for (let y = 240; y < HEIGHT; y += 36) bg.fillRect((y / 36) % 2 ? 20 : 60, y, 90, 4);
      bg.fillStyle(0xa8835a, 1);
      bg.fillRect(0, 196, 150, 40);
      bg.fillStyle(0x8a6a44, 1);
      bg.fillRect(0, 230, 150, 8);

      const sit = CLEO_SPRITES.animations.sitting;
      const cols = CLEO_SPRITES.columns;
      const frames = (row: number, n: number) =>
        Array.from({ length: n }, (_, i) => row * cols + i);
      for (const key of ['cleo-base', 'cleo-vest']) {
        this.anims.create({
          key: `${key}-sit`,
          frames: this.anims.generateFrameNumbers(key, { frames: frames(sit.row, sit.frames) }),
          frameRate: sit.fps,
          repeat: -1,
        });
        for (const name of ['happy', 'angry', 'surprised'] as const) {
          const a = CLEO_SPRITES.animations[name];
          this.anims.create({
            key: `${key}-${name}`,
            frames: this.anims.generateFrameNumbers(key, { frames: frames(a.row, a.frames) }),
            frameRate: a.fps,
            repeat: 0,
          });
        }
      }
      this.base = this.add.sprite(70, 160, 'cleo-base').setScale(3);
      this.vest = this.add.sprite(70, 160, 'cleo-vest').setScale(3);
      this.play('sit');

      // vara e linha
      const rod = this.add.graphics();
      rod.lineStyle(4, 0x4a403a, 1);
      rod.lineBetween(100, 150, 200, 90);
      this.line = this.add.graphics();
      this.bob = this.add.circle(200, 300, 7, 0xd9686b).setStrokeStyle(2, 0x4a403a);
      this.alert = this.add
        .text(200, 250, '!', {
          fontFamily: 'monospace',
          fontSize: '42px',
          color: '#d9686b',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setVisible(false);
      this.message = this.add
        .text(WIDTH / 2, HEIGHT - 70, 'Toque para lançar a linha', {
          fontFamily: 'sans-serif',
          fontSize: '16px',
          color: '#403b36',
          align: 'center',
          wordWrap: { width: 320 },
        })
        .setOrigin(0.5);
      this.drawLine();

      this.input.on('pointerdown', () => this.act());
      this.input.keyboard?.on('keydown-SPACE', () => this.act());
      this.input.keyboard?.on('keydown-ENTER', () => this.act());

      api = {
        pause: () => {
          this.scene.pause();
        },
        resume: () => {
          this.scene.resume();
        },
      };
      ctx.emitUiEvent({ type: 'TIMER', remainingMs: CASTS * 1000 });
      ctx.emitUiEvent({
        type: 'SHOW_HINT',
        message: `${CASTS} lançamentos. Pegue ${WIN_CATCHES} para vencer.`,
      });
    }

    private makeTextures(): void {
      const g = this.add.graphics();
      for (const f of FISH) {
        g.clear();
        g.fillStyle(0x4a403a, 1);
        g.fillEllipse(18, 10, 30, 16);
        g.fillTriangle(30, 10, 40, 2, 40, 18);
        g.fillStyle(f.color, 1);
        g.fillEllipse(18, 10, 26, 12);
        g.fillTriangle(29, 10, 38, 4, 38, 16);
        g.fillStyle(0x2b2f3a, 1);
        g.fillCircle(10, 8, 1.5);
        g.generateTexture(f.key, 42, 20);
      }
      g.destroy();
    }

    private play(anim: 'sit' | 'happy' | 'angry' | 'surprised'): void {
      this.base.play(`cleo-base-${anim}`, true);
      this.vest.play(`cleo-vest-${anim}`, true);
      if (anim !== 'sit') this.time.delayedCall(700, () => this.play('sit'));
    }

    private drawLine(): void {
      this.line.clear();
      this.line.lineStyle(2, 0x4a403a, 1);
      this.line.lineBetween(200, 90, this.bob.x, this.bob.y);
    }

    private act(): void {
      switch (this.phase) {
        case 'idle':
          this.cast();
          break;
        case 'waiting':
          void this.tooEarly();
          break;
        case 'bite':
          this.catchFish();
          break;
        default:
          break;
      }
    }

    private cast(): void {
      if (this.casts >= CASTS) return;
      this.casts += 1;
      this.phase = 'waiting';
      ctx.emitUiEvent({ type: 'TIMER', remainingMs: (CASTS - this.casts) * 1000 });
      this.message.setText('Esperando… não puxe cedo demais.');
      this.alert.setVisible(false);
      this.tweens.add({
        targets: this.bob,
        y: 300,
        duration: 300,
        onUpdate: () => this.drawLine(),
      });
      const progress = this.casts / CASTS;
      const wait = Phaser.Math.Between(1500, 4000);
      this.waitTimer = this.time.delayedCall(wait, () =>
        this.bite(Math.round(800 - 350 * progress)),
      );
    }

    private bite(windowMs: number): void {
      this.phase = 'bite';
      this.alert.setVisible(true);
      this.message.setText('AGORA! Toque!');
      ctx.emitUiEvent({ type: 'PLAY_FEEDBACK', sound: 'click' });
      if (!ctx.reducedMotion) {
        this.tweens.add({
          targets: this.bob,
          y: 314,
          duration: 80,
          yoyo: true,
          repeat: 4,
          onUpdate: () => this.drawLine(),
        });
        this.ripple();
      }
      this.biteTimer = this.time.delayedCall(windowMs, () => this.escaped());
    }

    private ripple(): void {
      const r = this.add.circle(this.bob.x, this.bob.y, 8).setStrokeStyle(2, 0xffffff, 0.8);
      this.ripples.push(r);
      this.tweens.add({
        targets: r,
        radius: 40,
        alpha: 0,
        duration: 600,
        onComplete: () => r.destroy(),
      });
    }

    private pickFish(): FishKind {
      const total = FISH.reduce((s, f) => s + f.weight, 0);
      let roll = Math.random() * total;
      for (const f of FISH) {
        roll -= f.weight;
        if (roll <= 0) return f;
      }
      return FISH[0]!;
    }

    private catchFish(): void {
      this.biteTimer?.remove(false);
      this.phase = 'resolving';
      this.alert.setVisible(false);
      const fish = this.pickFish();
      this.catches += 1;
      this.score += fish.score;
      ctx.emitUiEvent({ type: 'SCORE', score: this.score });
      ctx.emitUiEvent({ type: 'PLAY_FEEDBACK', sound: 'capture' });
      this.message.setText(`${fish.name}! +${fish.score}`);
      this.play('happy');
      const sprite = this.add.image(this.bob.x, this.bob.y, fish.key).setScale(1.5);
      this.tweens.add({
        targets: sprite,
        y: 120,
        x: 120,
        angle: -30,
        duration: ctx.reducedMotion ? 10 : 500,
        onComplete: () => {
          sprite.destroy();
          this.nextCast();
        },
      });
    }

    private escaped(): void {
      this.phase = 'resolving';
      this.alert.setVisible(false);
      this.message.setText('Escapou! Tarde demais.');
      ctx.emitUiEvent({ type: 'PLAY_FEEDBACK', sound: 'miss' });
      this.play('surprised');
      this.time.delayedCall(700, () => this.nextCast());
    }

    private async tooEarly(): Promise<void> {
      this.waitTimer?.remove(false);
      this.phase = 'resolving';
      this.message.setText('Cedo demais! Você espantou os peixes.');
      ctx.emitUiEvent({ type: 'PLAY_FEEDBACK', sound: 'heart' });
      this.play('angry');
      const r = await ctx.reportHeartLost();
      if (r.ok && (r.value.status === 'FAILED' || r.value.hearts <= 0)) {
        await this.finish('LOSS');
        return;
      }
      this.time.delayedCall(700, () => this.nextCast());
    }

    private nextCast(): void {
      if (this.phase === 'over') return;
      if (this.casts >= CASTS) {
        void this.finish(this.catches >= WIN_CATCHES ? 'WIN' : 'LOSS');
        return;
      }
      this.phase = 'idle';
      this.message.setText(`Toque para lançar (${CASTS - this.casts} restantes)`);
      this.tweens.add({
        targets: this.bob,
        y: 280,
        duration: 200,
        onUpdate: () => this.drawLine(),
      });
    }

    private async finish(outcome: 'WIN' | 'LOSS'): Promise<void> {
      if (this.phase === 'over') return;
      this.phase = 'over';
      this.waitTimer?.remove(false);
      this.biteTimer?.remove(false);
      this.message.setText(
        outcome === 'WIN' ? 'Pescaria encerrada: cesta cheia!' : 'Pescaria encerrada.',
      );
      ctx.emitUiEvent({ type: 'PLAY_FEEDBACK', sound: outcome === 'WIN' ? 'win' : 'lose' });
      await ctx.submitResult({
        score: this.score,
        outcome,
        durationMs: 0,
        metrics: { captures: this.catches, casts: this.casts },
      });
    }
  }

  const scene = new FishingScene();
  return { scene, bridge: { pause: () => api.pause(), resume: () => api.resume() } };
}
