import {
  domainError,
  err,
  ok,
  type CatalogItem,
  type DomainError,
  type InventoryEntry,
  type PurchaseReceipt,
  type Result,
  type Wallet,
} from '../contracts';
import { debit } from './economy-rules';

export interface PurchasePlan {
  wallet: Wallet;
  entry: InventoryEntry;
  receipt: PurchaseReceipt;
}

/**
 * Regras de compra (Mestre §5.4): item existe e está habilitado; item único não
 * repetido; limite de quantidade; saldo suficiente. Retorna o novo estado sem
 * gravar nada — quem grava é a transação.
 */
export function planPurchase(
  item: CatalogItem | undefined,
  wallet: Wallet,
  current: InventoryEntry | undefined,
  quantity: number,
  receiptId: string,
  now: Date,
): Result<PurchasePlan, DomainError> {
  if (!item || !item.enabled)
    return err(domainError('ITEM_NOT_FOUND', 'Este item não está disponível.'));
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return err(domainError('VALIDATION_FAILURE', 'Quantidade inválida.'));
  }
  if (!item.stackable && (quantity > 1 || current)) {
    return err(domainError('ITEM_LIMIT_REACHED', 'Você já tem este item.'));
  }
  const nextQuantity = (current?.quantity ?? 0) + quantity;
  if (item.maxQuantity !== undefined && nextQuantity > item.maxQuantity) {
    return err(domainError('ITEM_LIMIT_REACHED', `Limite de ${item.maxQuantity} para este item.`));
  }
  const total = item.price * quantity;
  if (!Number.isSafeInteger(total) || total < 0) {
    return err(domainError('VALIDATION_FAILURE', 'Preço inválido.'));
  }
  const debited = debit(wallet, total, now);
  if (!debited.ok) return debited;
  const iso = now.toISOString();
  return ok({
    wallet: debited.value,
    entry: {
      itemId: item.id,
      quantity: nextQuantity,
      acquiredAt: current?.acquiredAt ?? iso,
      consumed: current?.consumed ?? 0,
    },
    receipt: {
      id: receiptId,
      itemId: item.id,
      quantity,
      pricePaid: total,
      balanceAfter: debited.value.balance,
      purchasedAt: iso,
    },
  });
}
