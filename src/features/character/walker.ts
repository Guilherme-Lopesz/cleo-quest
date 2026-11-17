import { pickPhrase, type PhraseKey } from '@/content/phrases';
import { loadPreferences, prefersReducedMotion } from '@/features/preferences/preferences';
import { CharacterFsm, type CharacterSnapshot } from './fsm';
import { DEFAULT_OUTFIT, type Outfit } from './outfit';
import { SpriteView } from './sprite-view';

export interface WalkerHandle {
  pet(): void;
  react(reaction: 'surprised' | 'sad' | 'angry' | 'happy' | 'scratch'): void;
  use(kind: 'consumable' | 'toy'): void;
  say(text: string, ms?: number): void;
  setOutfit(outfit: Outfit): void;
  snapshot(): CharacterSnapshot;
  destroy(): void;
}

const OUTFIT_EVENT = 'cleo:outfit-changed';

/**
 * Elemento-assinatura (Mestre §4.2): a Cleo caminha pela base da tela, reage a
 * toques, fala e pausa quando a aba está oculta. Discreta: `pointer-events`
 * só no sprite, nunca sobre conteúdo.
 */
export function mountWalker(host: HTMLElement, assetBase: string): WalkerHandle {
  const reduced = prefersReducedMotion(loadPreferences());
  const fsm = new CharacterFsm({ reducedMotion: reduced });
  const sprite = new SpriteView(assetBase, DEFAULT_OUTFIT, 3);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cleo-walker__hit';
  button.setAttribute('aria-label', 'Fazer carinho na Cleo');
  button.appendChild(sprite.element);

  const bubble = document.createElement('span');
  bubble.className = 'cleo-walker__bubble';
  bubble.setAttribute('role', 'status');
  bubble.setAttribute('aria-live', 'polite');
  bubble.hidden = true;

  const actor = document.createElement('div');
  actor.className = 'cleo-walker__actor';
  actor.append(bubble, button);
  host.appendChild(actor);
  host.classList.add('cleo-walker--ready');

  let bubbleTimer: ReturnType<typeof setTimeout> | undefined;
  const say = (text: string, ms = 3200) => {
    bubble.textContent = text;
    bubble.hidden = false;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => {
      bubble.hidden = true;
    }, ms);
  };
  const sayFrom = (key: PhraseKey) => say(pickPhrase(key));

  let last = performance.now();
  let raf = 0;
  let running = false;
  let lastState = fsm.snapshot.state;

  const render = () => {
    const s = fsm.snapshot;
    sprite.setFrame(s.animation, s.frame);
    sprite.setFacing(s.facing);
    actor.style.transform = `translate3d(${Math.round(s.x)}px, 0, 0)`;
    if (s.state !== lastState) {
      if (s.state === 'sleeping') sayFrom('sleepy');
      lastState = s.state;
      document.dispatchEvent(new CustomEvent('cleo:walker-state', { detail: { state: s.state } }));
    }
  };

  const loop = (now: number) => {
    if (!running) return;
    const dt = Math.min(100, now - last);
    last = now;
    fsm.dispatch({ type: 'tick', dt });
    render();
    raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  const onVisibility = () => (document.hidden ? stop() : start());
  const measure = () => {
    const spriteWidth = sprite.element.getBoundingClientRect().width || 96;
    fsm.setRange(Math.max(0, host.clientWidth - spriteWidth));
  };
  const onPet = () => {
    const before = fsm.snapshot.state;
    fsm.dispatch({ type: 'pet' });
    const after = fsm.snapshot.state;
    if (after === 'angry') sayFrom('annoyed');
    else if (after === 'surprised' && before === 'sleeping') say('Miau?! Eu estava dormindo!');
    else if (after === 'happy') sayFrom('pet');
    render();
  };
  const onOutfit = (e: Event) => {
    const detail = (e as CustomEvent<Outfit>).detail;
    sprite.setOutfit(detail);
  };

  button.addEventListener('click', onPet);
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener(OUTFIT_EVENT, onOutfit);
  const ro = new ResizeObserver(measure);
  ro.observe(host);
  measure();
  render();
  start();

  // saudação discreta na primeira pintura
  setTimeout(() => sayFrom('greeting'), 900);

  return {
    pet: onPet,
    react: (reaction) => {
      fsm.dispatch({ type: 'react', reaction });
      render();
    },
    use: (kind) => {
      fsm.dispatch({ type: 'use', kind });
      render();
    },
    say,
    setOutfit: (outfit) => sprite.setOutfit(outfit),
    snapshot: () => fsm.snapshot,
    destroy: () => {
      stop();
      ro.disconnect();
      button.removeEventListener('click', onPet);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener(OUTFIT_EVENT, onOutfit);
      clearTimeout(bubbleTimer);
      actor.remove();
    },
  };
}

/** Avisa todas as instâncias da Cleo que a roupa mudou (usado por inventário/loja). */
export function broadcastOutfit(outfit: Outfit): void {
  document.dispatchEvent(new CustomEvent<Outfit>(OUTFIT_EVENT, { detail: outfit }));
}
