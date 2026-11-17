import type { GameContext, GameModule } from '@core/contracts';
import { createPhaserGame, type PhaserHandle } from '@engine/phaser/adapter';
import { createYarnScene, HEIGHT, WIDTH, type SceneBridge } from './scene';

/** Módulo do minigame "Pegue o Novelo" (Phaser, carregado sob demanda). */
export function createModule(): GameModule {
  let handle: PhaserHandle | null = null;
  let bridge: SceneBridge | null = null;
  return {
    async mount(container, context: GameContext) {
      handle = await createPhaserGame({
        parent: container,
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: '#f7f3ec',
        scene: (Phaser) => {
          const built = createYarnScene(Phaser, context);
          bridge = built.bridge;
          return built.scene;
        },
      });
    },
    pause: () => bridge?.pause(),
    resume: () => bridge?.resume(),
    destroy: () => {
      handle?.destroy();
      handle = null;
      bridge = null;
      return Promise.resolve();
    },
  };
}
