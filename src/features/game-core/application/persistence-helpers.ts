import {
  PersistenceError,
  domainError,
  err,
  type DomainError,
  type Result,
  DomainErrorException,
} from '../contracts';

/**
 * Executa uma operação transacional traduzindo exceções: erro de domínio
 * lançado dentro da transação vira `Result` de erro; falha de armazenamento
 * vira PERSISTENCE_FAILURE/VALIDATION_FAILURE. Nunca deixa exceção vazar para a UI.
 */
export async function guarded<T>(
  fn: () => Promise<Result<T, DomainError>>,
): Promise<Result<T, DomainError>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof DomainErrorException) return err(e.domainError);
    if (e instanceof PersistenceError) {
      if (e.kind === 'CORRUPT') return err(domainError('VALIDATION_FAILURE', e.message));
      return err(domainError('PERSISTENCE_FAILURE', e.message));
    }
    console.error('[game-core] falha inesperada', e);
    return err(domainError('PERSISTENCE_FAILURE', 'Não foi possível salvar. Tente novamente.'));
  }
}

/** Dentro de uma transação: converte um Result em valor ou aborta lançando. */
export function unwrap<T>(r: Result<T, DomainError>): T {
  if (r.ok) return r.value;
  throw new DomainErrorException(r.error);
}
