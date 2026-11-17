import {
  domainError,
  err,
  ok,
  type DomainError,
  type GameConfig,
  type GameId,
  type GameSession,
  type Outcome,
  type Result,
  type SessionId,
} from '../contracts';

export function createSession(
  id: SessionId,
  gameId: GameId,
  config: GameConfig,
  now: Date,
): GameSession {
  return {
    id,
    gameId,
    status: 'ACTIVE',
    hearts: config.maxHearts,
    maxHearts: config.maxHearts,
    score: 0,
    startedAt: now.toISOString(),
    resultSubmitted: false,
  };
}

/** Perde um coração; ao chegar a zero a sessão termina como FAILED (Mestre §5.3). */
export function loseHeart(session: GameSession, now: Date): Result<GameSession, DomainError> {
  if (session.status !== 'ACTIVE') {
    return err(domainError('SESSION_NOT_ACTIVE', 'A partida já terminou.'));
  }
  if (session.hearts <= 0) {
    return err(domainError('NO_HEARTS_LEFT', 'Não há corações para perder.'));
  }
  const hearts = session.hearts - 1;
  if (hearts === 0) {
    return ok({ ...session, hearts, status: 'FAILED', endedAt: now.toISOString() });
  }
  return ok({ ...session, hearts });
}

/**
 * Fecha a sessão com o resultado. Aceita sessão ACTIVE ou FAILED por corações
 * ainda sem resultado — o jogo reporta o placar final depois do último coração.
 */
export function completeSession(
  session: GameSession,
  outcome: Outcome,
  score: number,
  reward: number,
  now: Date,
): Result<GameSession, DomainError> {
  if (session.resultSubmitted) {
    return err(domainError('REWARD_ALREADY_CLAIMED', 'Resultado desta partida já foi processado.'));
  }
  if (session.status !== 'ACTIVE' && session.status !== 'FAILED') {
    return err(domainError('SESSION_NOT_ACTIVE', 'A partida não está ativa.'));
  }
  const finalOutcome: Outcome = session.status === 'FAILED' ? 'LOSS' : outcome;
  return ok({
    ...session,
    status: session.status === 'FAILED' ? 'FAILED' : 'COMPLETED',
    score,
    outcome: finalOutcome,
    rewardGranted: reward,
    resultSubmitted: true,
    endedAt: session.endedAt ?? now.toISOString(),
  });
}

export function abandonSession(session: GameSession, now: Date): Result<GameSession, DomainError> {
  if (session.status !== 'ACTIVE')
    return err(domainError('SESSION_NOT_ACTIVE', 'A partida não está ativa.'));
  return ok({ ...session, status: 'ABANDONED', resultSubmitted: true, endedAt: now.toISOString() });
}
