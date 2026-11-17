import {
  domainError,
  err,
  ok,
  sessionId as toSessionId,
  rewardSourceId,
  type DomainError,
  type GameId,
  type GameResultInput,
  type GameSession,
  type Result,
  type SessionId,
} from '../contracts';
import { gameConfig } from '../config/games';
import { abandonSession, completeSession, createSession, loseHeart } from '../domain/session-rules';
import { calculateReward } from '../domain/reward-policy';
import { validateResult } from '../domain/result-validation';
import { credit, emptyWallet } from '../domain/economy-rules';
import { afterSession, emptyStatistics } from '../domain/statistics-rules';
import type { CoreDeps } from './deps';
import { guarded, unwrap } from './persistence-helpers';

export class SessionService {
  constructor(private readonly deps: CoreDeps) {}

  /** Nova partida: corações cheios; abandona qualquer sessão ativa anterior do mesmo navegador. */
  async start(gameId: GameId): Promise<Result<GameSession, DomainError>> {
    const config = gameConfig(gameId);
    if (!config) return err(domainError('VALIDATION_FAILURE', `Jogo desconhecido: ${gameId}`));
    const { store, clock, ids, bus } = this.deps;
    const result = await guarded(() =>
      store.transaction(['sessions'], async (t) => {
        const now = clock.now();
        for (const s of await t.sessions.list()) {
          if (s.status === 'ACTIVE') await t.sessions.put(unwrap(abandonSession(s, now)));
        }
        const session = createSession(toSessionId(ids.next('session')), gameId, config, now);
        await t.sessions.put(session);
        return ok(session);
      }),
    );
    if (result.ok) bus.publish({ type: 'SessionStarted', sessionId: result.value.id, gameId });
    return result;
  }

  async get(id: SessionId): Promise<GameSession | null> {
    return this.deps.store.read(['sessions'], async (t) => (await t.sessions.get(id)) ?? null);
  }

  async getActive(): Promise<GameSession | null> {
    return this.deps.store.read(
      ['sessions'],
      async (t) => (await t.sessions.list()).find((s) => s.status === 'ACTIVE') ?? null,
    );
  }

  async loseHeart(id: SessionId): Promise<Result<GameSession, DomainError>> {
    const { store, clock, bus } = this.deps;
    const result = await guarded(() =>
      store.transaction(['sessions', 'statistics'], async (t) => {
        const session = await t.sessions.get(id);
        if (!session) return err(domainError('SESSION_NOT_FOUND', 'Partida não encontrada.'));
        const next = unwrap(loseHeart(session, clock.now()));
        await t.sessions.put(next);
        const stats = (await t.statistics.get('main')) ?? emptyStatistics();
        await t.statistics.put({ ...stats, heartsLost: stats.heartsLost + 1 });
        return ok(next);
      }),
    );
    if (result.ok) {
      const s = result.value;
      bus.publish({ type: 'HeartLost', sessionId: s.id, gameId: s.gameId, remaining: s.hearts });
      if (s.status === 'FAILED')
        bus.publish({ type: 'GameFailed', sessionId: s.id, gameId: s.gameId });
    }
    return result;
  }

  /**
   * Finalização (SAD §7.2/§7.3): valida, calcula recompensa pela política
   * central e grava sessão + claim + saldo + estatísticas em uma transação.
   * Reexecutar com a mesma sessão não paga de novo.
   */
  async complete(id: SessionId, input: GameResultInput): Promise<Result<GameSession, DomainError>> {
    const { store, clock, bus } = this.deps;
    let invalidReason: string | null = null;
    const result = await guarded(() =>
      store.transaction(['sessions', 'wallet', 'rewardClaims', 'statistics'], async (t) => {
        const now = clock.now();
        const session = await t.sessions.get(id);
        if (!session) return err(domainError('SESSION_NOT_FOUND', 'Partida não encontrada.'));
        if (session.resultSubmitted) return ok(session); // idempotente: devolve o que já foi processado
        const config = gameConfig(session.gameId);
        if (!config) return err(domainError('VALIDATION_FAILURE', 'Configuração do jogo ausente.'));

        // D-008: resultado implausível fecha a partida sem recompensa, sem travar o jogador.
        const validation = validateResult(config, input);
        const effectiveOutcome = session.status === 'FAILED' ? 'LOSS' : input.outcome;
        let reward = 0;
        let score = 0;
        if (validation.ok) {
          reward = calculateReward(config, { ...validation.value, outcome: effectiveOutcome });
          score = validation.value.score;
        } else {
          invalidReason = validation.error.message;
        }
        const closed = unwrap(completeSession(session, input.outcome, score, reward, now));
        const sourceId = rewardSourceId(`session:${session.id}`);
        if (reward > 0 && !(await t.rewardClaims.get(sourceId))) {
          const wallet = (await t.wallet.get('main')) ?? emptyWallet(now);
          await t.wallet.put(unwrap(credit(wallet, reward, now)));
          await t.rewardClaims.put({
            id: sourceId,
            amount: reward,
            reason: 'GAME_COMPLETION',
            claimedAt: now.toISOString(),
          });
        }
        await t.sessions.put(closed);
        const stats = (await t.statistics.get('main')) ?? emptyStatistics();
        await t.statistics.put(afterSession(stats, closed, input.metrics?.['captures'] ?? 0));
        return ok(closed);
      }),
    );
    if (result.ok && result.value.resultSubmitted && result.value.outcome) {
      const s = result.value;
      const outcome = s.outcome ?? 'LOSS';
      bus.publish({
        type: 'GameCompleted',
        sessionId: s.id,
        gameId: s.gameId,
        score: s.score,
        outcome,
        reward: s.rewardGranted ?? 0,
      });
      if ((s.rewardGranted ?? 0) > 0) {
        const balance = await this.deps.store.read(
          ['wallet'],
          async (t) => (await t.wallet.get('main'))?.balance ?? 0,
        );
        bus.publish({
          type: 'RewardGranted',
          sourceId: rewardSourceId(`session:${s.id}`),
          amount: s.rewardGranted ?? 0,
          balance,
        });
      }
    }
    if (invalidReason)
      console.warn('[game-core] resultado inválido ignorado para recompensa:', invalidReason);
    return result;
  }

  async abandon(id: SessionId): Promise<Result<GameSession, DomainError>> {
    const { store, clock } = this.deps;
    return guarded(() =>
      store.transaction(['sessions'], async (t) => {
        const session = await t.sessions.get(id);
        if (!session) return err(domainError('SESSION_NOT_FOUND', 'Partida não encontrada.'));
        if (session.status !== 'ACTIVE') return ok(session);
        const next = unwrap(abandonSession(session, clock.now()));
        await t.sessions.put(next);
        return ok(next);
      }),
    );
  }
}
