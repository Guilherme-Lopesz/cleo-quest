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
  {
    id: GAME_IDS.fishing,
    title: 'Pescaria',
    description: 'Espere o sinal, puxe a linha no tempo certo e veja o que a Cleo pesca.',
    instructions: [
      'Toque (ou espaço) para lançar a linha.',
      'Quando aparecer o "!", toque de novo para puxar.',
      'Puxar cedo demais espanta os peixes e custa um coração.',
      '10 lançamentos; pegue 5 peixes para vencer.',
    ],
    engine: 'phaser',
    icon: '🎣',
    load: () => import('@minigames/fishing').then((m) => m.createModule()),
  },
  {
    id: GAME_IDS.memory,
    title: 'Memória Felina',
    description: 'Encontre os pares de fotos da Cleo com o menor número de tentativas.',
    instructions: [
      'Vire duas cartas por vez; pares iguais ficam abertos.',
      'Cinco erros seguidos custam um coração.',
      'Menos tentativas, mais pontos.',
    ],
    engine: 'dom',
    icon: '🃏',
    load: () => import('@minigames/cat-memory').then((m) => m.createModule()),
  },
];

export function gameById(id: GameId | string): MinigameDefinition | undefined {
  return GAMES.find((g) => g.id === id);
}
