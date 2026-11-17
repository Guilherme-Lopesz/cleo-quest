/** State Manager mínimo (SAD §10.3): só estado reativo de UI, nunca cópia do banco. */
export interface Store<T> {
  get(): T;
  set(patch: Partial<T>): void;
  subscribe(listener: (state: T) => void): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<(s: T) => void>();
  return {
    get: () => state,
    set: (patch) => {
      state = { ...state, ...patch };
      for (const l of listeners) l(state);
    },
    subscribe: (l) => {
      listeners.add(l);
      l(state);
      return () => listeners.delete(l);
    },
  };
}

export interface GameUiState {
  ready: boolean;
  balance: number;
  activeSessionId: string | null;
  hearts: number;
  maxHearts: number;
  ownedCount: number;
  equipped: Partial<Record<'BODY' | 'HEAD' | 'NECK' | 'SCENE', string>>;
  storageStatus: 'ok' | 'unavailable' | 'corrupt';
  lastError: string | null;
}

export const initialUiState: GameUiState = {
  ready: false,
  balance: 0,
  activeSessionId: null,
  hearts: 0,
  maxHearts: 5,
  ownedCount: 0,
  equipped: {},
  storageStatus: 'ok',
  lastError: null,
};
