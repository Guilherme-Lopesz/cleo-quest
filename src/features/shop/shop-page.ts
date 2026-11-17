import {
  getGameCore,
  itemId,
  type DomainError,
  type GameCore,
  type InventoryEntry,
} from '@/features/game-core';
import { remaining } from '@core/domain/inventory-rules';
import { toast } from '@/features/ui/toast';
import { pickPhrase } from '@/content/phrases';

const errorMessage = (e: DomainError): string => {
  switch (e.code) {
    case 'INSUFFICIENT_FUNDS':
      return 'Cleo Coins insuficientes. Que tal uma partida no parque?';
    case 'ITEM_LIMIT_REACHED':
      return 'Você já tem este item (ou chegou ao limite).';
    case 'PERSISTENCE_FAILURE':
      return 'Não foi possível salvar a compra. Nada foi debitado.';
    case 'VALIDATION_FAILURE':
      return 'Os dados salvos parecem corrompidos. Nada foi alterado.';
    default:
      return e.message;
  }
};

/** Estado visual de cada cartão a partir do inventário/customização (fonte: repositório). */
export function cardState(
  card: HTMLElement,
  entry: InventoryEntry | undefined,
  equipped: Record<string, string | undefined>,
): 'available' | 'owned' | 'equipped' | 'consumed' | 'maxed' {
  const id = card.dataset['itemId'] ?? '';
  const kind = card.dataset['kind'];
  const stackable = card.dataset['stackable'] === 'true';
  if (!entry || entry.quantity === 0) return 'available';
  if (Object.values(equipped).includes(id)) return 'equipped';
  if (kind === 'CONSUMABLE') return remaining(entry) > 0 ? 'owned' : 'consumed';
  if (!stackable) return 'owned';
  return 'owned';
}

async function render(core: GameCore, root: ParentNode): Promise<void> {
  const [inventory, customization, balance] = await Promise.all([
    core.inventory.list(),
    core.inventory.getCustomization(),
    core.economy.getBalance(),
  ]);
  const byId = new Map(inventory.map((e) => [e.itemId as string, e]));
  document
    .querySelectorAll('[data-shop-balance]')
    .forEach((el) => (el.textContent = String(balance)));
  for (const card of root.querySelectorAll<HTMLElement>('.item-card')) {
    const id = card.dataset['itemId'] ?? '';
    const entry = byId.get(id);
    const state = cardState(card, entry, customization.equipped);
    card.dataset['state'] = state;
    const status = card.querySelector<HTMLElement>('[data-status]');
    const qty = card.querySelector<HTMLElement>('[data-qty]');
    const price = Number(card.dataset['price']);
    const buy = card.querySelector<HTMLButtonElement>('[data-action="buy"]');
    if (buy) {
      const stackable = card.dataset['stackable'] === 'true';
      const canAfford = balance >= price;
      buy.disabled = !canAfford;
      buy.title = canAfford ? '' : 'Saldo insuficiente';
      if (stackable && entry) card.dataset['state'] = 'available';
    }
    if (qty) {
      if (entry && card.dataset['kind'] === 'CONSUMABLE') {
        qty.textContent = `${remaining(entry)} restante${remaining(entry) === 1 ? '' : 's'}`;
        qty.hidden = false;
      } else qty.hidden = true;
    }
    if (status) {
      status.textContent =
        state === 'equipped'
          ? 'Equipado'
          : state === 'owned'
            ? 'No inventário'
            : state === 'consumed'
              ? 'Acabou'
              : '';
    }
  }
}

export async function mountShop(): Promise<void> {
  const grid = document.getElementById('shop-grid');
  if (!grid) return;
  const core = await getGameCore();
  await render(core, grid);
  core.bus.onAny(() => void render(core, grid));
  grid.setAttribute('aria-busy', 'false');

  grid.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action="buy"]');
    if (!btn) return;
    const card = btn.closest<HTMLElement>('.item-card')!;
    const id = card.dataset['itemId']!;
    card.dataset['busy'] = 'true';
    const r = await core.shop.purchase(itemId(id));
    card.dataset['busy'] = 'false';
    if (r.ok) {
      toast(`Comprado! ${pickPhrase('purchase')}`, 'success');
      const walker = (window as unknown as { cleoWalker?: { say(t: string): void } }).cleoWalker;
      walker?.say(pickPhrase('purchase'));
    } else {
      toast(errorMessage(r.error), 'danger');
    }
    await render(core, grid);
  });

  // filtros por categoria
  document.querySelectorAll<HTMLButtonElement>('.shop-tabs [data-category]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const cat = tab.dataset['category'] ?? '';
      document
        .querySelectorAll('.shop-tabs [data-category]')
        .forEach((t) => t.classList.toggle('is-active', t === tab));
      for (const card of grid.querySelectorAll<HTMLElement>('.item-card')) {
        card.hidden = Boolean(cat) && card.dataset['category'] !== cat;
      }
    });
  });
}
