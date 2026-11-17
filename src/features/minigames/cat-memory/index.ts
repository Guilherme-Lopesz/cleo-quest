import type { GameContext, GameModule } from '@core/contracts';
import { PHOTOS } from '@/features/gallery/photos';

const PAIRS = 6;
const MISS_STREAK_FOR_HEART = 5;

interface Card {
  id: number;
  photoId: string;
  src: string;
  alt: string;
  el: HTMLButtonElement;
  matched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Memória Felina em HTML/CSS (Mestre §6.3): jogo de cartas sem game loop.
 * O estado do tabuleiro é do minigame; o Core só recebe o resultado.
 */
export function createModule(): GameModule {
  let root: HTMLElement | null = null;
  let paused = false;
  let over = false;
  let startedAt = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  return {
    mount(container, ctx: GameContext) {
      root = document.createElement('div');
      root.className = 'memory';
      root.setAttribute('role', 'group');
      root.setAttribute('aria-label', 'Tabuleiro da memória');
      const grid = document.createElement('div');
      grid.className = 'memory__grid';
      root.appendChild(grid);
      container.appendChild(root);

      const base = ctx.assetBase;
      const pool = shuffle(PHOTOS).slice(0, PAIRS);
      const deck: Card[] = shuffle(
        pool.flatMap((p, i) =>
          [0, 1].map((k) => ({
            id: i * 2 + k,
            photoId: p.id,
            src: `${base}${p.thumbnail}`,
            alt: p.alt,
            matched: false,
            el: null as unknown as HTMLButtonElement,
          })),
        ),
      );

      let first: Card | null = null;
      let second: Card | null = null;
      let attempts = 0;
      let missStreak = 0;
      let matched = 0;
      let lock = false;

      const label = (c: Card) =>
        c.matched
          ? `Par encontrado: ${c.alt}`
          : c.el.classList.contains('is-flipped')
            ? c.alt
            : 'Carta virada para baixo';

      deck.forEach((card) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'memory__card';
        b.setAttribute('aria-label', 'Carta virada para baixo');
        b.innerHTML = `<span class="memory__face memory__face--back" aria-hidden="true">🐾</span><span class="memory__face memory__face--front" aria-hidden="true"><img src="${card.src}" alt="" loading="lazy" decoding="async"></span>`;
        b.addEventListener('click', () => void flip(card));
        card.el = b;
        grid.appendChild(b);
      });

      const tick = () => {
        if (paused || over) return;
        const elapsed = Math.round((performance.now() - startedAt) / 1000);
        ctx.emitUiEvent({ type: 'TIMER', remainingMs: elapsed * 1000 });
      };
      startedAt = performance.now();
      timer = setInterval(tick, 1000);
      ctx.emitUiEvent({
        type: 'SHOW_HINT',
        message: `Encontre ${PAIRS} pares. ${MISS_STREAK_FOR_HEART} erros seguidos custam um coração.`,
      });
      ctx.emitUiEvent({ type: 'TIMER', remainingMs: 0 });

      const score = () => {
        // 180 pela conclusão + até 120 de bônus por eficiência (mín. 6 tentativas)
        const bonus = Math.max(0, 120 - Math.max(0, attempts - PAIRS) * 8);
        return Math.min(300, matched * 30 + (matched === PAIRS ? bonus : 0));
      };

      async function flip(card: Card): Promise<void> {
        if (lock || paused || over || card.matched || card === first) return;
        card.el.classList.add('is-flipped');
        card.el.setAttribute('aria-label', label(card));
        ctx.emitUiEvent({ type: 'PLAY_FEEDBACK', sound: 'click' });
        if (!first) {
          first = card;
          return;
        }
        second = card;
        lock = true;
        attempts += 1;
        if (first.photoId === second.photoId) {
          first.matched = second.matched = true;
          first.el.classList.add('is-matched');
          second.el.classList.add('is-matched');
          first.el.setAttribute('aria-label', label(first));
          second.el.setAttribute('aria-label', label(second));
          matched += 1;
          missStreak = 0;
          ctx.emitUiEvent({ type: 'SCORE', score: score() });
          ctx.emitUiEvent({ type: 'PLAY_FEEDBACK', sound: 'capture' });
          first = second = null;
          lock = false;
          if (matched === PAIRS) await finish('WIN');
          return;
        }
        missStreak += 1;
        ctx.emitUiEvent({ type: 'PLAY_FEEDBACK', sound: 'miss' });
        const a = first;
        const b = second;
        await new Promise((r) => setTimeout(r, ctx.reducedMotion ? 350 : 800));
        a.el.classList.remove('is-flipped');
        b.el.classList.remove('is-flipped');
        a.el.setAttribute('aria-label', 'Carta virada para baixo');
        b.el.setAttribute('aria-label', 'Carta virada para baixo');
        first = second = null;
        lock = false;
        if (missStreak >= MISS_STREAK_FOR_HEART) {
          missStreak = 0;
          ctx.emitUiEvent({
            type: 'SHOW_HINT',
            message: 'Cinco erros seguidos. A Cleo revirou os olhos.',
          });
          const r = await ctx.reportHeartLost();
          if (r.ok && (r.value.status === 'FAILED' || r.value.hearts <= 0)) await finish('LOSS');
        }
      }

      async function finish(outcome: 'WIN' | 'LOSS'): Promise<void> {
        if (over) return;
        over = true;
        clearInterval(timer);
        ctx.emitUiEvent({ type: 'PLAY_FEEDBACK', sound: outcome === 'WIN' ? 'win' : 'lose' });
        await ctx.submitResult({
          score: score(),
          outcome,
          durationMs: 0,
          metrics: { attempts, pairs: matched },
        });
      }
      return Promise.resolve();
    },
    pause: () => {
      paused = true;
      root?.classList.add('is-paused');
    },
    resume: () => {
      paused = false;
      root?.classList.remove('is-paused');
    },
    destroy: () => {
      clearInterval(timer);
      over = true;
      root?.remove();
      root = null;
      return Promise.resolve();
    },
  };
}
