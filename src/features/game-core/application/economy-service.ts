import {
  ok,
  type DomainError,
  type Result,
  type RewardReason,
  type RewardSourceId,
  type Wallet,
  rewardSourceId,
} from '../contracts';
import { credit, emptyWallet } from '../domain/economy-rules';
import { afterReward, emptyStatistics } from '../domain/statistics-rules';
import { ECONOMY } from '../config/economy';
import type { CoreDeps } from './deps';
import { guarded, unwrap } from './persistence-helpers';

export interface GrantRewardInput {
  sourceId: RewardSourceId;
  amount: number;
  reason: RewardReason;
  metadata?: Record<string, string | number | boolean>;
}

export interface GrantOutcome {
  wallet: Wallet;
  /** false quando a recompensa já havia sido concedida (idempotência). */
  granted: boolean;
}

export class EconomyService {
  constructor(private readonly deps: CoreDeps) {}

  async getBalance(): Promise<number> {
    return this.deps.store.read(
      ['wallet'],
      async (t) => (await t.wallet.get('main'))?.balance ?? 0,
    );
  }

  /**
   * Idempotente por `sourceId` (SAD §6.2): verificação do claim, registro e
   * atualização do saldo acontecem na mesma transação.
   */
  async grantReward(input: GrantRewardInput): Promise<Result<GrantOutcome, DomainError>> {
    const { store, clock, bus } = this.deps;
    const result = await guarded(() =>
      store.transaction(['wallet', 'rewardClaims', 'statistics'], async (t) => {
        const now = clock.now();
        const existing = await t.rewardClaims.get(input.sourceId);
        const wallet = (await t.wallet.get('main')) ?? emptyWallet(now);
        if (existing) return ok({ wallet, granted: false });
        const credited = unwrap(credit(wallet, input.amount, now));
        await t.wallet.put(credited);
        await t.rewardClaims.put({
          id: input.sourceId,
          amount: input.amount,
          reason: input.reason,
          claimedAt: now.toISOString(),
          ...(input.metadata ? { metadata: input.metadata } : {}),
        });
        if (input.reason !== 'GAME_COMPLETION') {
          const stats = (await t.statistics.get('main')) ?? emptyStatistics();
          await t.statistics.put(afterReward(stats, input.amount));
        }
        return ok({ wallet: credited, granted: true });
      }),
    );
    if (result.ok && result.value.granted) {
      bus.publish({
        type: 'RewardGranted',
        sourceId: input.sourceId,
        amount: input.amount,
        balance: result.value.wallet.balance,
      });
    }
    return result;
  }

  /** Bônus de boas-vindas (D-004) — uma única vez por navegador. */
  grantWelcomeBonus(): Promise<Result<GrantOutcome, DomainError>> {
    return this.grantReward({
      sourceId: rewardSourceId('first-visit'),
      amount: ECONOMY.welcomeBonus,
      reason: 'FIRST_VISIT',
    });
  }

  async wasClaimed(sourceId: RewardSourceId): Promise<boolean> {
    return this.deps.store.read(['rewardClaims'], async (t) =>
      Boolean(await t.rewardClaims.get(sourceId)),
    );
  }
}
