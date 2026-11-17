import { getGameCore, itemId, type CatalogItem, type DomainError } from '@/features/game-core';
import { HOUSE_SLOTS, itemAt } from '@core/domain/house-rules';
import { SpriteView } from '@/features/character/sprite-view';
import { SpriteAnimator } from '@/features/character/animator';
import { outfitFromCustomization } from '@/features/character/outfit-sync';
import { loadPreferences, prefersReducedMotion } from '@/features/preferences/preferences';
import { toast } from '@/features/ui/toast';
import { itemImage } from '@/features/ui/format';
import { pickPhrase } from '@/content/phrases';

const errorMessage = (e: DomainError): string =>
  e.code === 'INVALID_PLACEMENT'
    ? 'Esse item não cabe nesse cantinho.'
    : e.code === 'ITEM_NOT_OWNED'
      ? 'Você ainda não tem este item.'
      : e.code === 'PERSISTENCE_FAILURE'
        ? 'Não foi possível salvar. Nada foi alterado.'
        : e.message;

const INTERACTION_ANIM = {
  sleep: 'sleeping',
  play: 'playing',
  eat: 'eating',
  drink: 'eating',
  scratch: 'scratch',
} as const;

const INTERACTION_PHRASE: Record<keyof typeof INTERACTION_ANIM, string> = {
  sleep: 'Zzz… cinco minutinhos.',
  play: 'Peguei! Ninguém viu, mas peguei.',
  eat: 'Crocante. Aprovado.',
  drink: 'Água corrente. Civilização.',
  scratch: 'O sofá agradece. Por enquanto.',
};

export async function mountHouse(): Promise<void> {
  const house = document.getElementById('house');
  const chooser = document.getElementById('house-chooser') as HTMLDialogElement | null;
  const list = document.getElementById('chooser-list');
  const emptyMsg = document.getElementById('chooser-empty');
  if (!house || !chooser || !list || !emptyMsg) return;
  const base = house.dataset['assetBase'] ?? '';
  const core = await getGameCore();

  // Cleo mora na casinha: começa no quarto e vai até o cantinho com que interage.
  const view = new SpriteView(base, { body: null, head: null, neck: null }, 3);
  const animator = new SpriteAnimator(view, prefersReducedMotion(loadPreferences()));
  const anchors = new Map(
    [...house.querySelectorAll<HTMLElement>('[data-cleo-anchor]')].map((el) => [
      el.dataset['cleoAnchor']!,
      el,
    ]),
  );
  anchors.get('quarto')?.appendChild(view.element);
  animator.play('idle');
  let bubbleTimer: ReturnType<typeof setTimeout> | undefined;
  const say = (room: string, text: string) => {
    const anchor = anchors.get(room);
    if (!anchor) return;
    let bubble = anchor.querySelector<HTMLElement>('.cleo-walker__bubble');
    if (!bubble) {
      bubble = document.createElement('span');
      bubble.className = 'cleo-walker__bubble';
      bubble.style.position = 'absolute';
      bubble.style.bottom = '100px';
      anchor.appendChild(bubble);
    }
    bubble.textContent = text;
    bubble.hidden = false;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => (bubble.hidden = true), 2500);
  };

  const render = async () => {
    const [record, inventory, customization] = await Promise.all([
      core.house.get(),
      core.inventory.list(),
      core.inventory.getCustomization(),
    ]);
    view.setOutfit(outfitFromCustomization(customization.equipped, (id) => core.catalog.get(id)));
    const owned = new Set(inventory.filter((e) => e.quantity > 0).map((e) => e.itemId as string));
    for (const slotEl of house.querySelectorAll<HTMLElement>('[data-slot]')) {
      const slotId = slotEl.dataset['slot']!;
      const slot = HOUSE_SLOTS.find((s) => s.id === slotId)!;
      const placed = itemAt(record, slotId);
      const item = placed ? core.catalog.get(placed) : undefined;
      const img = slotEl.querySelector<HTMLImageElement>('.slot__img')!;
      const name = slotEl.querySelector<HTMLElement>('[data-slot-name]')!;
      const btn = slotEl.querySelector<HTMLButtonElement>('[data-slot-action="open"]')!;
      const remove = slotEl.querySelector<HTMLButtonElement>('[data-slot-action="remove"]')!;
      if (item && owned.has(item.id)) {
        slotEl.dataset['state'] = 'filled';
        img.src = itemImage(base, item.image);
        img.hidden = false;
        name.textContent = item.name;
        btn.setAttribute(
          'aria-label',
          `${slot.label}: ${item.name}.${item.interaction ? ' Interagir' : ' Trocar'}`,
        );
        btn.dataset['slotAction'] = item.interaction ? 'interact' : 'open';
        remove.hidden = false;
      } else {
        slotEl.dataset['state'] = 'empty';
        img.hidden = true;
        name.textContent = '';
        btn.setAttribute('aria-label', `${slot.label}: vazio. Escolher item`);
        btn.dataset['slotAction'] = 'open';
        remove.hidden = true;
      }
    }
  };
  await render();
  core.bus.onAny(() => void render());
  house.setAttribute('aria-busy', 'false');

  const openChooser = async (slotId: string) => {
    const slot = HOUSE_SLOTS.find((s) => s.id === slotId);
    if (!slot) return;
    const inventory = await core.inventory.list();
    const candidates: CatalogItem[] = inventory
      .filter((e) => e.quantity > 0)
      .map((e) => core.catalog.get(e.itemId))
      .filter((i): i is CatalogItem =>
        Boolean(i && i.kind === 'FURNITURE' && i.room === slot.room),
      );
    list.innerHTML = '';
    emptyMsg.hidden = candidates.length > 0;
    for (const item of candidates) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chooser__item';
      b.innerHTML = `<img src="${itemImage(base, item.image)}" alt="" width="16" height="16"><span>${item.name}</span>`;
      b.addEventListener('click', async () => {
        chooser.close();
        const r = await core.house.place(slotId, itemId(item.id));
        if (!r.ok) toast(errorMessage(r.error), 'danger');
        else {
          toast(`${item.name} colocado em ${slot.label.toLowerCase()}.`, 'success');
          moveCleo(slot.room);
          animator.play('happy', () => animator.play('idle'));
        }
      });
      li.appendChild(b);
      list.appendChild(li);
    }
    chooser.showModal();
  };

  const moveCleo = (room: string) => {
    const anchor = anchors.get(room);
    if (anchor && view.element.parentElement !== anchor) anchor.appendChild(view.element);
  };

  const interact = (slotId: string) => {
    const slot = HOUSE_SLOTS.find((s) => s.id === slotId);
    if (!slot) return;
    void core.house.get().then((record) => {
      const placed = itemAt(record, slotId);
      const item = placed ? core.catalog.get(placed) : undefined;
      const kind = item?.interaction;
      if (!kind) return;
      moveCleo(slot.room);
      say(slot.room, INTERACTION_PHRASE[kind]);
      const anim = INTERACTION_ANIM[kind];
      animator.play(anim, () => animator.play('idle'));
      if (anim === 'sleeping') setTimeout(() => animator.play('idle'), 3500);
    });
  };

  house.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-slot-action]');
    if (!btn) return;
    const slotId = btn.closest<HTMLElement>('[data-slot]')!.dataset['slot']!;
    switch (btn.dataset['slotAction']) {
      case 'open':
        await openChooser(slotId);
        break;
      case 'interact':
        interact(slotId);
        break;
      case 'remove': {
        const r = await core.house.remove(slotId);
        if (!r.ok) toast(errorMessage(r.error), 'danger');
        else say(HOUSE_SLOTS.find((s) => s.id === slotId)?.room ?? 'quarto', pickPhrase('annoyed'));
        break;
      }
      default:
        break;
    }
  });
}
