import type * as PhaserNS from 'phaser';

export type PhaserModule = typeof PhaserNS;
export type SceneFactory = (Phaser: PhaserModule) => PhaserNS.Scene;

export interface PhaserHandle {
  game: PhaserNS.Game;
  Phaser: PhaserModule;
  destroy(): void;
}

let phaserPromise: Promise<PhaserModule> | null = null;

/** Carrega o Phaser uma única vez, sob demanda (SAD §8.3). Nunca importado estaticamente. */
export function loadPhaser(): Promise<PhaserModule> {
  phaserPromise ??= import('phaser').then((m) => m.default ?? m);
  return phaserPromise;
}

export interface PhaserGameOptions {
  parent: HTMLElement;
  width: number;
  height: number;
  backgroundColor: string;
  scene: SceneFactory;
}

/**
 * Cria um jogo Phaser dentro do container com escala FIT (mobile-first) e
 * devolve um handle que destrói canvas, cenas, timers e listeners ao sair.
 */
export async function createPhaserGame(opts: PhaserGameOptions): Promise<PhaserHandle> {
  const Phaser = await loadPhaser();
  const scene = opts.scene(Phaser);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: opts.parent,
    width: opts.width,
    height: opts.height,
    backgroundColor: opts.backgroundColor,
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, parent: opts.parent },
    physics: { default: 'arcade', arcade: { debug: false } },
    audio: { noAudio: true }, // áudio é responsabilidade do site (Web Audio), nunca da engine
    input: { activePointers: 2 },
    scene,
  });
  return {
    game,
    Phaser,
    destroy: () => {
      game.destroy(true, false);
    },
  };
}
