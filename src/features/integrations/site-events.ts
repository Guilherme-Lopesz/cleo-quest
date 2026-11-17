import { getGameCore } from '@/features/game-core';
import { ECONOMY } from '@core/config/economy';
import { achievementById, EASTER_EGGS, type EasterEggId } from '@core/config/achievements';
import { achievementId, rewardSourceId } from '@core/contracts';
import { toast } from '@/features/ui/toast';
import { pickPhrase } from '@/content/phrases';
import { audio } from '@/features/audio/audio-manager';

const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

/**
 * Cola o site ao Game Core: toasts de conquista/recompensa, exploração de
 * capítulos, fotos vistas, carinho na Cleo e easter eggs. Carregado após a
 * página ficar ociosa, em todas as páginas.
 */
export async function mountSiteEvents(): Promise<void> {
  const core = await getGameCore();
  const walker = () =>
    (
      window as unknown as {
        cleoWalker?: { say(t: string): void; react(r: 'happy' | 'surprised'): void };
      }
    ).cleoWalker;

  core.bus.on('AchievementUnlocked', (e) => {
    const def = achievementById(e.achievementId);
    if (!def) return;
    toast(
      `${def.icon} Conquista: ${def.title}${e.reward ? ` (+${e.reward} 🪙)` : ''}`,
      'success',
      5000,
    );
    audio().play('achievement');
  });
  core.bus.on('RewardGranted', (e) => {
    if (e.sourceId.startsWith('chapter:'))
      toast(`+${e.amount} 🪙 por explorar um capítulo novo`, 'success');
    if (e.sourceId.startsWith('egg:')) toast(`+${e.amount} 🪙 — segredo encontrado!`, 'success');
  });
  core.bus.on('EasterEggFound', () => walker()?.react('surprised'));
  core.bus.on('ItemPurchased', () => audio().play('purchase'));

  // Primeiro carinho
  document.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.cleo-walker__hit')) {
      audio().play(Math.random() < 0.5 ? 'meow' : 'purr');
      void core.achievements.unlockDirect(achievementId('primeiro-carinho'));
    }
  });

  // Fotos vistas (lightbox)
  document.addEventListener('cleo:photo-viewed', () => void core.achievements.recordPhotoViewed());

  // Capítulos explorados: marco pago uma vez quando o capítulo fica visível por 1,5s
  const chapters = document.querySelectorAll<HTMLElement>(
    '[data-chapter-id][data-milestone="true"]',
  );
  if (chapters.length && 'IntersectionObserver' in window) {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset['chapterId']!;
          if (entry.isIntersecting) {
            timers.set(
              id,
              setTimeout(
                () => void core.achievements.recordChapter(id, ECONOMY.chapterExplorationReward),
                1500,
              ),
            );
          } else {
            clearTimeout(timers.get(id));
          }
        }
      },
      { threshold: 0.5 },
    );
    chapters.forEach((c) => io.observe(c));
  }

  const foundEgg = async (id: EasterEggId) => {
    const added = await core.achievements.recordEasterEgg(id);
    if (added) {
      await core.economy.grantReward({
        sourceId: rewardSourceId(`egg:${id}`),
        amount: ECONOMY.easterEggReward,
        reason: 'SPECIAL_EVENT',
      });
      walker()?.say(pickPhrase('easterEgg'));
    }
  };

  // Easter egg: Konami Code
  let konamiIndex = 0;
  document.addEventListener('keydown', (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    konamiIndex = key === KONAMI[konamiIndex] ? konamiIndex + 1 : key === KONAMI[0] ? 1 : 0;
    if (konamiIndex === KONAMI.length) {
      konamiIndex = 0;
      void foundEgg('konami');
    }
  });

  // Easter egg: cliques repetidos deixam a Cleo brava
  document.addEventListener('cleo:walker-state', (e) => {
    if ((e as CustomEvent<{ state: string }>).detail.state === 'angry')
      void foundEgg('cliques-na-cleo');
  });

  // Easter egg: pegadas — arrastar o dedo/mouse sobre o palco do hero deixa pegadas; 20 delas = segredo
  const stage = document.querySelector<HTMLElement>('.hero__stage');
  if (stage) {
    let prints = 0;
    let last = 0;
    stage.addEventListener('pointermove', (e) => {
      if (performance.now() - last < 120) return;
      last = performance.now();
      const rect = stage.getBoundingClientRect();
      const paw = document.createElement('span');
      paw.className = 'pawprint';
      paw.textContent = '🐾';
      paw.style.left = `${e.clientX - rect.left}px`;
      paw.style.top = `${e.clientY - rect.top}px`;
      stage.appendChild(paw);
      setTimeout(() => paw.remove(), 1800);
      prints += 1;
      if (prints === 20) void foundEgg('pegadas');
    });
  }

  // Easter egg: caixa secreta escondida numa página
  document
    .querySelector('[data-easter-egg="caixa-secreta"]')
    ?.addEventListener('click', () => void foundEgg('caixa-secreta'));

  // Expõe contagem para a página de conquistas
  (window as unknown as { cleoEggs?: readonly string[] }).cleoEggs = EASTER_EGGS;
  // Sinal de prontidão: integrações ativas (usado por testes E2E e por quem precisar).
  document.documentElement.dataset['cleoReady'] = 'true';
}
