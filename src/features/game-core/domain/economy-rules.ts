import {
  coins,
  domainError,
  err,
  ok,
  type DomainError,
  type Result,
  type Wallet,
} from '../contracts';
import { ECONOMY } from '../config/economy';

export function emptyWallet(now: Date): Wallet {
  return { id: 'main', balance: coins(0), updatedAt: now.toISOString() };
}

export function credit(wallet: Wallet, amount: number, now: Date): Result<Wallet, DomainError> {
  if (!Number.isInteger(amount) || amount < 0 || amount > ECONOMY.absoluteMaxGrant) {
    return err(domainError('VALIDATION_FAILURE', `Valor de crédito inválido: ${amount}.`));
  }
  return ok({ ...wallet, balance: coins(wallet.balance + amount), updatedAt: now.toISOString() });
}

export function debit(wallet: Wallet, amount: number, now: Date): Result<Wallet, DomainError> {
  if (!Number.isInteger(amount) || amount < 0) {
    return err(domainError('VALIDATION_FAILURE', `Valor de débito inválido: ${amount}.`));
  }
  if (wallet.balance < amount) {
    return err(domainError('INSUFFICIENT_FUNDS', 'Cleo Coins insuficientes.'));
  }
  return ok({ ...wallet, balance: coins(wallet.balance - amount), updatedAt: now.toISOString() });
}
