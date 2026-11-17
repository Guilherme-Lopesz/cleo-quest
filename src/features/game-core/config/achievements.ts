import { achievementId, type AchievementDefinition } from '../contracts';

/** Conquistas (Mestre §5.8; decisão D-005/§20.7: 6 únicas + 2 cumulativas). */
export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: achievementId('primeiro-carinho'),
    title: 'Primeiro carinho',
    description: 'Fez carinho na Cleo pela primeira vez.',
    rewardCoins: 20,
    unique: true,
    icon: '🐾',
  },
  {
    id: achievementId('primeira-partida'),
    title: 'Sobreviveu à fofura',
    description: 'Concluiu a primeira partida.',
    rewardCoins: 30,
    unique: true,
    icon: '🎮',
  },
  {
    id: achievementId('cacador-de-novelos'),
    title: 'Caçador de novelos',
    description: 'Capturou 25 novelos no total.',
    rewardCoins: 50,
    unique: true,
    target: 25,
    icon: '🧶',
  },
  {
    id: achievementId('explorador-de-memorias'),
    title: 'Explorador de memórias',
    description: 'Visitou todos os capítulos da história.',
    rewardCoins: 40,
    unique: true,
    target: 4,
    icon: '📖',
  },
  {
    id: achievementId('primeiro-item'),
    title: 'Primeiro item comprado',
    description: 'Fez a primeira compra na loja.',
    rewardCoins: 20,
    unique: true,
    icon: '🛍️',
  },
  {
    id: achievementId('decorador'),
    title: 'Decorador da casinha',
    description: 'Colocou o primeiro móvel na casinha.',
    rewardCoins: 30,
    unique: true,
    icon: '🏡',
  },
  {
    id: achievementId('colecionador'),
    title: 'Colecionador de lembranças',
    description: 'Possui 10 itens diferentes.',
    rewardCoins: 60,
    unique: true,
    target: 10,
    icon: '🎒',
  },
  {
    id: achievementId('todos-os-easter-eggs'),
    title: 'Encontrou todos os easter eggs',
    description: 'Descobriu os 4 segredos escondidos no site.',
    rewardCoins: 100,
    unique: true,
    target: 4,
    icon: '🥚',
    secret: true,
  },
];

export const EASTER_EGGS = ['konami', 'cliques-na-cleo', 'pegadas', 'caixa-secreta'] as const;
export type EasterEggId = (typeof EASTER_EGGS)[number];

export function achievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
