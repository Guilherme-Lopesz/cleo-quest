import { CATALOG_ITEMS, createCatalog } from '@core/config/catalog';
import { coins, itemId, type Wallet } from '@core/contracts';
import { planPurchase } from '@core/domain/shop-rules';
import { consume, emptyCustomization, equip, unequip } from '@core/domain/inventory-rules';
import { credit, debit } from '@core/domain/economy-rules';
import { HOUSE_SLOTS, emptyHouse, place } from '@core/domain/house-rules';

const now = new Date('2026-11-17T03:00:00Z');
const catalog = createCatalog();
const wallet = (balance: number): Wallet => ({
  id: 'main',
  balance: coins(balance),
  updatedAt: now.toISOString(),
});

describe('economia', () => {
  it('saldo nunca fica negativo', () => {
    const r = debit(wallet(10), 11, now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INSUFFICIENT_FUNDS');
  });
  it('não aceita valores inválidos ou acima do teto absoluto', () => {
    expect(credit(wallet(0), -1, now).ok).toBe(false);
    expect(credit(wallet(0), 1.5, now).ok).toBe(false);
    expect(credit(wallet(0), 10_000, now).ok).toBe(false);
    expect(credit(wallet(0), 50, now).ok).toBe(true);
  });
});

describe('compra', () => {
  const coroa = catalog.get('coroa')!;
  it('planeja débito + inventário + recibo quando há saldo', () => {
    const r = planPurchase(coroa, wallet(200), undefined, 1, 'r1', now);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.wallet.balance).toBe(80);
      expect(r.value.entry.quantity).toBe(1);
      expect(r.value.receipt.pricePaid).toBe(120);
    }
  });
  it('saldo insuficiente não altera nada', () => {
    const r = planPurchase(coroa, wallet(10), undefined, 1, 'r1', now);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INSUFFICIENT_FUNDS');
  });
  it('item único não pode ser comprado duas vezes', () => {
    const r = planPurchase(
      coroa,
      wallet(999),
      { itemId: coroa.id, quantity: 1, acquiredAt: 'x', consumed: 0 },
      1,
      'r2',
      now,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('ITEM_LIMIT_REACHED');
  });
  it('consumível empilha até o limite', () => {
    const petisco = catalog.get('petisco')!;
    const r = planPurchase(
      petisco,
      wallet(999),
      { itemId: petisco.id, quantity: 49, acquiredAt: 'x', consumed: 0 },
      2,
      'r3',
      now,
    );
    expect(r.ok).toBe(false);
  });
  it('item desconhecido ou desabilitado é rejeitado', () => {
    expect(planPurchase(undefined, wallet(999), undefined, 1, 'r', now).ok).toBe(false);
    expect(planPurchase({ ...coroa, enabled: false }, wallet(999), undefined, 1, 'r', now).ok).toBe(
      false,
    );
  });
});

describe('inventário', () => {
  const coroa = catalog.get('coroa')!;
  const petisco = catalog.get('petisco')!;
  it('equipar exige posse e slot; consumível não equipa', () => {
    const c = emptyCustomization(now);
    expect(equip(coroa, undefined, c, now).ok).toBe(false);
    const owned = { itemId: coroa.id, quantity: 1, acquiredAt: 'x', consumed: 0 };
    const r = equip(coroa, owned, c, now);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.customization.equipped.HEAD).toBe('coroa');
    const food = equip(petisco, { ...owned, itemId: petisco.id }, c, now);
    expect(food.ok).toBe(false);
    if (!food.ok) expect(food.error.code).toBe('ITEM_NOT_EQUIPPABLE');
  });
  it('desequipar limpa o slot', () => {
    const c = { ...emptyCustomization(now), equipped: { HEAD: itemId('coroa') } };
    expect(unequip(c, 'HEAD', now).equipped.HEAD).toBeUndefined();
  });
  it('consumir decrementa e esgota', () => {
    const entry = { itemId: petisco.id, quantity: 2, acquiredAt: 'x', consumed: 1 };
    const r = consume(petisco, entry);
    expect(r.ok).toBe(true);
    if (r.ok) expect(consume(petisco, r.value).ok).toBe(false);
  });
});

describe('casinha', () => {
  it('móvel só entra em slot do cômodo certo e exige posse', () => {
    const caminha = catalog.get('caminha')!;
    const h = emptyHouse(now);
    expect(place(h, 'quarto-cama', caminha, undefined, now).ok).toBe(false);
    const owned = { itemId: caminha.id, quantity: 1, acquiredAt: 'x', consumed: 0 };
    expect(place(h, 'cozinha-racao', caminha, owned, now).ok).toBe(false);
    const r = place(h, 'quarto-cama', caminha, owned, now);
    expect(r.ok).toBe(true);
    expect(HOUSE_SLOTS.length).toBeGreaterThan(5);
  });
});

describe('catálogo', () => {
  it('tem itens de todos os tipos e o colete teal custa zero', () => {
    const kinds = new Set(CATALOG_ITEMS.map((i) => i.kind));
    expect([...kinds].sort()).toEqual([
      'COLLECTIBLE',
      'CONSUMABLE',
      'COSMETIC',
      'FURNITURE',
      'TOY',
    ]);
    expect(catalog.get('colete-teal')?.price).toBe(0);
  });
});
