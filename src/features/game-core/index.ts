/**
 * Ponto de entrada único do Game Core para a interface. Escolhe a persistência
 * (IndexedDB; memória como fallback explícito) e inicializa uma vez por página.
 */
import { GameCore } from './application/game-core';
import { DexieProgressStore } from '@infra/persistence/dexie-store';
import { MemoryProgressStore } from '@infra/persistence/memory-store';

export type { GameCore } from './application/game-core';
export type { GameUiState } from './application/store';
export * from './contracts';

let instance: Promise<GameCore> | null = null;

export function getGameCore(): Promise<GameCore> {
  if (!instance) {
    instance = (async () => {
      const supported = DexieProgressStore.isSupported();
      const core = new GameCore({
        store: supported ? new DexieProgressStore() : new MemoryProgressStore(),
      });
      await core.init();
      if (!supported)
        core.ui.set({
          storageStatus: 'unavailable',
          lastError: 'IndexedDB indisponível: o progresso dura só esta visita.',
        });
      return core;
    })();
  }
  return instance;
}
