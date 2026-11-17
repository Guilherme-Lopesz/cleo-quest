import { getGameCore, itemId, type DomainError } from '@/features/game-core';
import { remaining } from '@core/domain/inventory-rules';
import { SpriteView } from '@/features/character/sprite-view';
import { SpriteAnimator } from '@/features/character/animator';
import { outfitFromCustomization } from '@/features/character/outfit-sync';
import { loadPreferences, prefersReducedMotion } from '@/features/preferences/preferences';
import { toast } from '@/features/ui/toast';
import { SLOT_LABELS } from '@/features/ui/format';
import { pickPhrase } from '@/content/phrases';

const errorMessage = (e: DomainError): string => {
  switch (e.code) {
    case 'ITEM_NOT_OWNED':
      return 'Você ainda não tem este item.';
    case 'ITEM_NOT_EQUIPPABLE':
      return 'Este item não pode ser equipado.';
    case 'PERSISTENCE_FAILURE':
      return 'Não foi possível salvar. Nada foi alterado.';
    default:
      return e.message;
  }
};

export async function mountInventory(): Promise<void> {
  const grid = document.getElementById('inv-grid');
  const stage = document.getElementById('inv-preview-stage');
  const slots = document.getElementById('inv-slots');
  const summary = document.getElementById('inv-summary');
  const empty = document.getElementById('inv-empty');
  if (!grid || !stage || !slots || !summary || !empty) return;

  const core = await getGameCore();
  const view = new SpriteView(
    stage.dataset['assetBase'] ?? '',
    { body: null, head: null, neck: null },
    3,
  );
  stage.appendChild(view.element);
  const animator = new SpriteAnimator(view, prefersReducedMotion(loadPreferences()));
  animator.play('idle');

  const render = async () => {
    const [inventory, customization] = await Promise.all([
      core.inventory.list(),
      core.inventory.getCustomization(),
    ]);
    const byId = new Map(inventory.map((e) => [e.itemId as string, e]));
    const owned = inventory.filter((e) => e.quantity > 0);
    view.setOutfit(outfitFromCustomization(customization.equipped, (id) => core.catalog.get(id)));
    summary.textContent = owned.length
      ? `${owned.length} ${owned.length === 1 ? 'item' : 'itens'} na mochila.`
      : '';
    empty.hidden = owned.length > 0;
    slots.innerHTML = '';
    for (const [slot, id] of Object.entries(customization.equipped)) {
      if (!id) continue;
      const b = document.createElement('span');
      b.className = 'badge';
      b.textContent = `${SLOT_LABELS[slot] ?? slot}: ${core.catalog.get(id)?.name ?? id}`;
      slots.appendChild(b);
    }
    for (const card of grid.querySelectorAll<HTMLElement>('.item-card')) {
      const id = card.dataset['itemId'] ?? '';
      const entry = byId.get(id);
      card.hidden = !entry || entry.quantity === 0;
      if (card.hidden) continue;
      const isEquipped = Object.values(customization.equipped).includes(itemId(id));
      const kind = card.dataset['kind'];
      const left = remaining(entry);
      card.dataset['state'] = isEquipped
        ? 'equipped'
        : kind === 'CONSUMABLE' && left === 0
          ? 'consumed'
          : 'owned';
      const qty = card.querySelector<HTMLElement>('[data-qty]');
      if (qty) {
        qty.hidden = kind !== 'CONSUMABLE';
        qty.textContent = `${left} restante${left === 1 ? '' : 's'}`;
      }
      const equipBtn = card.querySelector<HTMLButtonElement>('[data-action="equip"]');
      if (equipBtn) equipBtn.textContent = isEquipped ? 'Remover' : 'Equipar';
      const status = card.querySelector<HTMLElement>('[data-status]');
      if (status)
        status.textContent = isEquipped
          ? 'Equipado'
          : kind === 'CONSUMABLE' && left === 0
            ? 'Acabou'
            : '';
    }
  };
  await render();
  core.bus.onAny(() => void render());

  grid.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
    if (!btn) return;
    const card = btn.closest<HTMLElement>('.item-card')!;
    const id = itemId(card.dataset['itemId']!);
    const item = core.catalog.get(id);
    if (!item) return;
    card.dataset['busy'] = 'true';
    if (btn.dataset['action'] === 'equip') {
      const customization = await core.inventory.getCustomization();
      const isEquipped = Object.values(customization.equipped).includes(id);
      const r =
        isEquipped && item.equipSlot
          ? await core.inventory.unequip(item.equipSlot)
          : await core.inventory.equip(id);
      if (!r.ok) toast(errorMessage(r.error), 'danger');
      else animator.play('happy', () => animator.play('idle'));
    } else if (btn.dataset['action'] === 'use') {
      const r = await core.inventory.consume(id);
      if (!r.ok) toast(errorMessage(r.error), 'danger');
      else {
        animator.play('eating', () => animator.play('idle'));
        toast(pickPhrase('pet'), 'success');
      }
    }
    card.dataset['busy'] = 'false';
    await render();
  });
}
