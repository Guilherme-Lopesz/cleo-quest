export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export type DomainErrorCode =
  | 'INSUFFICIENT_FUNDS'
  | 'ITEM_NOT_FOUND'
  | 'ITEM_NOT_OWNED'
  | 'ITEM_NOT_EQUIPPABLE'
  | 'ITEM_LIMIT_REACHED'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_NOT_ACTIVE'
  | 'SESSION_ALREADY_ACTIVE'
  | 'NO_HEARTS_LEFT'
  | 'REWARD_ALREADY_CLAIMED'
  | 'INVALID_RESULT'
  | 'INVALID_PLACEMENT'
  | 'PERSISTENCE_FAILURE'
  | 'VALIDATION_FAILURE';

export interface DomainError {
  code: DomainErrorCode;
  message: string;
}

export const domainError = (code: DomainErrorCode, message: string): DomainError => ({
  code,
  message,
});

/** Exceção usada para abortar uma transação a partir de um erro de domínio. */
export class DomainErrorException extends Error {
  constructor(readonly domainError: DomainError) {
    super(domainError.message);
    this.name = 'DomainErrorException';
  }
}

export function toResult<T>(fn: () => T): Result<T, DomainError> {
  try {
    return ok(fn());
  } catch (e) {
    if (e instanceof DomainErrorException) return err(e.domainError);
    throw e;
  }
}
