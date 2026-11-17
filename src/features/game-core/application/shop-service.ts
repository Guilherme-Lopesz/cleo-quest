import {
  domainError,
  err,
  ok,
  type CatalogItem,
  type DomainError,
  type ItemId,
  type PurchaseReceipt,
  type Result,
} from '../contracts';
import { planPurchase } from '../domain/shop-rules';
import { emptyWallet } from '../domain/economy-rules';
import { afterPurchase, emptyStatistics } from '../domain/statistics-rules';
import type { CoreDeps } from './deps';
import { guarded, unwrap } from './persistence-helpers';

export class ShopService {
  constructor(private readonly deps: CoreDeps) {}

  listItems(): CatalogItem[] {
    return this.deps.catalog.list().filter((i) => i.enabled);
  }

  /** Compra atômica (SAD §9.3): saldo, inventário e recibo na mesma transação, ou nada. */
  async purchase(itemId: ItemId, quantity = 1): Promise<Result<PurchaseReceipt, DomainError>> {
    const { store, clock, ids, bus, catalog } = this.deps;
    const item = catalog.get(itemId);
    if (!item) return err(domainError('ITEM_NOT_FOUND', 'Este item não existe.'));
    const result = await guarded(() =>
      store.transaction(['wallet', 'inventory', 'purchases', 'statistics'], async (t) => {
        const now = clock.now();
        const wallet = (await t.wallet.get('main')) ?? emptyWallet(now);
        const current = await t.inventory.get(itemId);
        const plan = unwrap(
          planPurchase(item, wallet, current, quantity, ids.next('purchase'), now),
        );
        if (await t.purchases.get(plan.receipt.id)) {
          return err(domainError('VALIDATION_FAILURE', 'Recibo duplicado.'));
        }
        await t.wallet.put(plan.wallet);
        await t.inventory.put(plan.entry);
        await t.purchases.put(plan.receipt);
        const stats = (await t.statistics.get('main')) ?? emptyStatistics();
        await t.statistics.put(afterPurchase(stats, plan.receipt.pricePaid, quantity));
        return ok(plan.receipt);
      }),
    );
    if (result.ok) {
      bus.publish({ type: 'ItemPurchased', itemId, quantity, balance: result.value.balanceAfter });
    }
    return result;
  }
}
