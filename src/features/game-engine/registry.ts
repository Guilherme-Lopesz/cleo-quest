import { GAME_IDS } from '@core/config/games';
import type { GameId, MinigameDefinition } from '@core/contracts';

/** Registro de minigames (SAD §3.1 Game Registry). `load` é dinâmico: nada de jogo entra no bundle do site. */
export const GAMES: MinigameDefinition[] = [
  {
    id: GAME_IDS.yarn,
    title: 'Pegue o Novelo',
    description: 'Novelos caem do céu. Pepinos também. Pegue os certos, desvie dos errados.',
    instructions: [
      'Arraste o dedo (ou use ← →) para mover a Cleo.',
      'Pegue novelos para pontuar; os dourados valem mais.',
      'Pepinos assustam a Cleo e custam um coração.',
      'A partida dura 60 segundos ou até acabarem os corações.',
    ],
    engine: 'phaser',
    icon: '🧶',
    load: () => import('@minigames/yarn-catcher').then((m) => m.createModule()),
  },
];

export function gameById(id: GameId | string): MinigameDefinition | undefined {
  return GAMES.find((g) => g.id === id);
}
