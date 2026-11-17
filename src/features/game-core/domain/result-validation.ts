import {
  domainError,
  type DomainError,
  type GameConfig,
  type GameResultInput,
  type Result,
  ok,
  err,
} from '../contracts';

/** Plausibilidade do resultado (SAD §7.2): limites de pontuação e duração por jogo. */
export function validateResult(
  config: GameConfig,
  input: GameResultInput,
): Result<GameResultInput, DomainError> {
  if (!Number.isInteger(input.score) || input.score < 0) {
    return err(domainError('INVALID_RESULT', 'Pontuação deve ser inteiro não negativo.'));
  }
  if (input.score > config.limits.maxScore) {
    return err(
      domainError('INVALID_RESULT', `Pontuação acima do limite (${config.limits.maxScore}).`),
    );
  }
  if (!Number.isFinite(input.durationMs) || input.durationMs < config.limits.minDurationMs) {
    return err(domainError('INVALID_RESULT', 'Partida curta demais para ser válida.'));
  }
  if (input.durationMs > config.limits.maxDurationMs) {
    return err(domainError('INVALID_RESULT', 'Partida longa demais para ser válida.'));
  }
  if (!['WIN', 'LOSS', 'DRAW'].includes(input.outcome)) {
    return err(domainError('INVALID_RESULT', 'Resultado desconhecido.'));
  }
  return ok(input);
}
