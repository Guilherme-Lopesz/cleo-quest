import type * as PhaserNS from 'phaser';
import type { GameContext } from '@core/contracts';
import { CLEO_SPRITES } from '@/features/character/manifest.generated';

export const WIDTH = 360;
export const HEIGHT = 560;
export const ROUND_MS = 60_000;

const SCORE_YARN = 10;
const SCORE_GOLD = 25;

export interface SceneBridge {
  pause(): void;
  resume(): void;
}

type ItemKind = 'yarn' | 'gold' | 'cucumber';

/**
 * Cena do "Pegue o Novelo". Recebe o módulo Phaser por parâmetro (nunca
 * importado estaticamente) e fala com o Core apenas pelo GameContext.
 */
export function createYarnScene(
  Phaser: typeof PhaserNS,
  ctx: GameContext,
): { scene: PhaserNS.Scene; bridge: SceneBridge } {
  let api: SceneBridge = { pause: () => undefined, resume: () => undefined };

  class YarnScene extends Phaser.Scene {
    private player!: PhaserNS.GameObjects.Container;
    private playerBody!: PhaserNS.Physics.Arcade.Body;
    private base!: PhaserNS.GameObjects.Sprite;
    private vest!: PhaserNS.GameObjects.Sprite;
    private items!: PhaserNS.Physics.Arcade.Group;
    private cursors: PhaserNS.Types.Input.Keyboard.CursorKeys | undefined;
    private targetX = WIDTH / 2;
    private score = 0;
    private captures = 0;
    private combo = 0;
    private elapsed = 0;
    private spawnAcc = 0;
    private over = false;
    private hearts = ctx.maxHearts;
    private reacting = false;
    private lastTimerSec = -1;

    constructor() {
      super('yarn');
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
      this.makeBackground();
      this.makeAnimations();
      this.makePlayer();
      this.items = this.physics.add.group();
      this.physics.add.overlap(this.player, this.items, (_p, item) =>
        this.onItem(item as PhaserNS.GameObjects.Sprite),
      );

      this.input.on('pointerdown', (p: PhaserNS.Input.Pointer) => (this.targetX = p.worldX));
      this.input.on('pointermove', (p: PhaserNS.Input.Pointer) => {
        if (p.isDown) this.targetX = p.worldX;
      });
      this.cursors = this.input.keyboard?.createCursorKeys();
      this.input.keyboard?.on('keydown-A', () => (this.targetX = 0));
      this.input.keyboard?.on('keydown-D', () => (this.targetX = WIDTH));

      api = {
        pause: () => {
          this.scene.pause();
        },
        resume: () => {
          this.scene.resume();
        },
      };
      ctx.emitUiEvent({ type: 'TIMER', remainingMs: ROUND_MS });
      ctx.emitUiEvent({ type: 'SHOW_HINT', message: 'Pegue os novelos. Fuja dos pepinos.' });
    }

    private makeTextures(): void {
      const g = this.add.graphics();
      // novelo: círculo rosa com "linhas"
      const yarn = (key: string, fill: number, dark: number) => {
        g.clear();
        g.fillStyle(0x4a403a, 1);
        g.fillCircle(14, 14, 14);
        g.fillStyle(fill, 1);
        g.fillCircle(14, 14, 12);
        g.lineStyle(2, dark, 1);
        g.beginPath();
        g.arc(14, 14, 8, 0.3, 2.2);
        g.strokePath();
        g.beginPath();
        g.arc(14, 14, 5, 2.6, 5.2);
        g.strokePath();
        g.lineBetween(20, 8, 26, 2);
        g.generateTexture(key, 28, 28);
      };
      yarn('yarn', 0xe89ab5, 0xc76f91);
      yarn('gold', 0xe4c25a, 0xb8963a);
      // pepino: elipse verde com pontinhos
      g.clear();
      g.fillStyle(0x4a403a, 1);
      g.fillEllipse(14, 16, 16, 32);
      g.fillStyle(0x6fae5a, 1);
      g.fillEllipse(14, 16, 12, 28);
      g.fillStyle(0x4f8a3f, 1);
      g.fillCircle(11, 9, 1.5);
      g.fillCircle(16, 15, 1.5);
      g.fillCircle(12, 22, 1.5);
      g.generateTexture('cucumber', 28, 32);
      // partícula
      g.clear();
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture('spark', 4, 4);
      g.destroy();
    }

    private makeBackground(): void {
      const bg = this.add.graphics();
      bg.fillGradientStyle(0xf7f3ec, 0xf7f3ec, 0xe8ddc9, 0xe8ddc9, 1);
      bg.fillRect(0, 0, WIDTH, HEIGHT);
      bg.fillStyle(0xd2c5ae, 1);
      bg.fillRect(0, HEIGHT - 40, WIDTH, 40);
      bg.fillStyle(0xc9b296, 1);
      for (let x = 0; x < WIDTH; x += 24) bg.fillRect(x, HEIGHT - 40, 12, 4);
    }

    private makeAnimations(): void {
      const walk = CLEO_SPRITES.animations.walk;
      const idle = CLEO_SPRITES.animations.idle;
      const angry = CLEO_SPRITES.animations.angry;
      const happy = CLEO_SPRITES.animations.happy;
      const cols = CLEO_SPRITES.columns;
      const frames = (row: number, n: number) =>
        Array.from({ length: n }, (_, i) => row * cols + i);
      for (const key of ['cleo-base', 'cleo-vest']) {
        this.anims.create({
          key: `${key}-walk`,
          frames: this.anims.generateFrameNumbers(key, { frames: frames(walk.row, walk.frames) }),
          frameRate: walk.fps,
          repeat: -1,
        });
        this.anims.create({
          key: `${key}-idle`,
          frames: this.anims.generateFrameNumbers(key, { frames: frames(idle.row, idle.frames) }),
          frameRate: idle.fps,
          repeat: -1,
        });
        this.anims.create({
          key: `${key}-angry`,
          frames: this.anims.generateFrameNumbers(key, { frames: frames(angry.row, angry.frames) }),
          frameRate: angry.fps,
          repeat: 0,
        });
        this.anims.create({
          key: `${key}-happy`,
          frames: this.anims.generateFrameNumbers(key, { frames: frames(happy.row, happy.frames) }),
          frameRate: happy.fps,
          repeat: 0,
        });
      }
    }

    private makePlayer(): void {
      this.base = this.add.sprite(0, 0, 'cleo-base', 0).setScale(3);
      this.vest = this.add.sprite(0, 0, 'cleo-vest', 0).setScale(3);
      this.player = this.add.container(WIDTH / 2, HEIGHT - 40 - 48, [this.base, this.vest]);
      this.physics.world.enable(this.player);
      this.playerBody = this.player.body as PhaserNS.Physics.Arcade.Body;
      this.playerBody.setSize(60, 50).setOffset(-30, -20);
      this.playerBody.setCollideWorldBounds(true);
      this.play('idle');
    }

    private play(anim: 'walk' | 'idle' | 'angry' | 'happy'): void {
      this.base.play(`cleo-base-${anim}`, true);
      this.vest.play(`cleo-vest-${anim}`, true);
    }

    override update(_time: number, delta: number): void {
      if (this.over) return;
      this.elapsed += delta;
      const remaining = Math.max(0, ROUND_MS - this.elapsed);
      const sec = Math.ceil(remaining / 1000);
      if (sec !== this.lastTimerSec) {
        this.lastTimerSec = sec;
        ctx.emitUiEvent({ type: 'TIMER', remainingMs: remaining });
      }
      if (remaining <= 0) {
        void this.finish('WIN');
        return;
      }
      this.movePlayer(delta);
      this.spawn(delta);
      for (const obj of this.items.getChildren()) {
        const s = obj as PhaserNS.GameObjects.Sprite;
        if (s.y > HEIGHT + 20) {
          if (s.getData('kind') !== 'cucumber') this.combo = 0;
          s.destroy();
        }
      }
    }

    private movePlayer(delta: number): void {
      const cur = this.cursors;
      if (cur?.left.isDown) this.targetX = this.player.x - 200;
      if (cur?.right.isDown) this.targetX = this.player.x + 200;
      const clamped = Phaser.Math.Clamp(this.targetX, 36, WIDTH - 36);
      const dx = clamped - this.player.x;
      const speed = 0.42 * delta; // px por ms
      if (Math.abs(dx) > 2) {
        this.player.x += Math.sign(dx) * Math.min(Math.abs(dx), speed);
        this.base.setFlipX(dx < 0);
        this.vest.setFlipX(dx < 0);
        if (!this.reacting) this.play('walk');
      } else if (!this.reacting) {
        this.play('idle');
      }
    }

    private spawn(delta: number): void {
      // dificuldade progressiva: intervalo cai de 1100ms para 450ms; velocidade sobe
      const t = Math.min(1, this.elapsed / ROUND_MS);
      const interval = 1100 - 650 * t;
      this.spawnAcc += delta;
      if (this.spawnAcc < interval) return;
      this.spawnAcc = 0;
      const roll = Math.random();
      const kind: ItemKind =
        roll < 0.06 ? 'gold' : roll < 0.06 + 0.14 + 0.16 * t ? 'cucumber' : 'yarn';
      const x = Phaser.Math.Between(24, WIDTH - 24);
      const item = this.items.create(x, -20, kind) as PhaserNS.GameObjects.Sprite;
      item.setData('kind', kind);
      const body = item.body as PhaserNS.Physics.Arcade.Body;
      body.setVelocityY(120 + 140 * t + Phaser.Math.Between(0, 40));
      body.setVelocityX(Phaser.Math.Between(-20, 20));
      if (kind !== 'cucumber') body.setAngularVelocity(Phaser.Math.Between(-90, 90));
    }

    private onItem(item: PhaserNS.GameObjects.Sprite): void {
      if (this.over || !item.active) return;
      const kind = item.getData('kind') as ItemKind;
      const x = item.x;
      const y = item.y;
      item.destroy();
      if (kind === 'cucumber') {
        void this.hitCucumber();
        return;
      }
      this.combo += 1;
      const bonus = Math.min(5, Math.floor(this.combo / 5));
      this.score += (kind === 'gold' ? SCORE_GOLD : SCORE_YARN) + bonus;
      this.captures += 1;
      ctx.emitUiEvent({ type: 'SCORE', score: this.score });
      ctx.emitUiEvent({ type: 'PLAY_FEEDBACK', sound: 'capture' });
      if (!ctx.reducedMotion) this.burst(x, y, kind === 'gold' ? 0xe4c25a : 0xe89ab5);
      if (this.combo > 0 && this.combo % 5 === 0) {
        ctx.emitUiEvent({
          type: 'SHOW_HINT',
          message: `Combo ${this.combo}! A Cleo está impressionada.`,
        });
        this.react('happy');
      }
    }

    private async hitCucumber(): Promise<void> {
      ctx.emitUiEvent({ type: 'PLAY_FEEDBACK', sound: 'heart' });
      this.react('angry');
      this.combo = 0;
      if (!ctx.reducedMotion) this.cameras.main.shake(150, 0.004);
      const r = await ctx.reportHeartLost();
      if (!r.ok) return;
      this.hearts = r.value.hearts;
      if (r.value.status === 'FAILED' || this.hearts <= 0) await this.finish('LOSS');
    }

    private react(anim: 'angry' | 'happy'): void {
      this.reacting = true;
      this.play(anim);
      this.time.delayedCall(500, () => {
        this.reacting = false;
      });
    }

    private burst(x: number, y: number, tint: number): void {
      const emitter = this.add.particles(x, y, 'spark', {
        speed: { min: 40, max: 120 },
        lifespan: 350,
        quantity: 8,
        scale: { start: 1, end: 0 },
        tint,
        emitting: false,
      });
      emitter.explode(8, x, y);
      this.time.delayedCall(400, () => emitter.destroy());
    }

    private async finish(outcome: 'WIN' | 'LOSS'): Promise<void> {
      if (this.over) return;
      this.over = true;
      this.physics.pause();
      this.play(outcome === 'WIN' ? 'happy' : 'idle');
      ctx.emitUiEvent({ type: 'PLAY_FEEDBACK', sound: outcome === 'WIN' ? 'win' : 'lose' });
      await ctx.submitResult({
        score: this.score,
        outcome,
        durationMs: 0,
        metrics: { captures: this.captures, combo: this.combo },
      });
    }
  }

  const scene = new YarnScene();
  return {
    scene,
    bridge: {
      pause: () => api.pause(),
      resume: () => api.resume(),
    },
  };
}
