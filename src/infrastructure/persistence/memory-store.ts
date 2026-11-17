import type { KeyedTable, ProgressStore, ProgressTables, TableName } from '@core/contracts';
import { TABLE_KEYS } from '@core/contracts';

/**
 * Implementação em memória da porta de persistência: transações serializadas
 * com snapshot/rollback. Usada em testes e como fallback quando IndexedDB
 * não está disponível (nesse caso o progresso dura só a visita).
 */
export class MemoryProgressStore implements ProgressStore {
  private data: Record<TableName, Map<string, unknown>> = this.emptyData();
  private queue: Promise<unknown> = Promise.resolve();
  /** Hook de teste: lança dentro da transação para simular falha de gravação. */
  failOnPut: ((table: TableName) => boolean) | null = null;

  private emptyData(): Record<TableName, Map<string, unknown>> {
    return Object.fromEntries(
      (Object.keys(TABLE_KEYS) as TableName[]).map((k) => [k, new Map()]),
    ) as Record<TableName, Map<string, unknown>>;
  }

  private tables(
    target: Record<TableName, Map<string, unknown>>,
    writable: boolean,
  ): ProgressTables {
    const make = <T>(name: TableName): KeyedTable<T> => {
      const key = TABLE_KEYS[name] as keyof T & string;
      const map = target[name];
      return {
        get: (k) => Promise.resolve(map.get(k) as T | undefined),
        put: (v) => {
          if (!writable) return Promise.reject(new Error('transação somente leitura'));
          if (this.failOnPut?.(name)) return Promise.reject(new Error(`falha simulada em ${name}`));
          map.set(String((v as Record<string, unknown>)[key]), structuredClone(v));
          return Promise.resolve();
        },
        delete: (k) => {
          map.delete(k);
          return Promise.resolve();
        },
        list: () => Promise.resolve([...map.values()].map((v) => structuredClone(v) as T)),
      };
    };
    return {
      profiles: make('profiles'),
      wallet: make('wallet'),
      sessions: make('sessions'),
      inventory: make('inventory'),
      purchases: make('purchases'),
      rewardClaims: make('rewardClaims'),
      achievements: make('achievements'),
      statistics: make('statistics'),
      customization: make('customization'),
      house: make('house'),
    };
  }

  transaction<T>(_tables: readonly TableName[], fn: (t: ProgressTables) => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      const snapshot = this.cloneData();
      try {
        return await fn(this.tables(this.data, true));
      } catch (e) {
        this.data = snapshot; // rollback
        throw e;
      }
    };
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  read<T>(_tables: readonly TableName[], fn: (t: ProgressTables) => Promise<T>): Promise<T> {
    return fn(this.tables(this.data, false));
  }

  clear(): Promise<void> {
    this.data = this.emptyData();
    return Promise.resolve();
  }

  exportAll(): Promise<Record<TableName, unknown[]>> {
    return Promise.resolve(
      Object.fromEntries(
        (Object.keys(this.data) as TableName[]).map((k) => [k, [...this.data[k].values()]]),
      ) as Record<TableName, unknown[]>,
    );
  }

  private cloneData(): Record<TableName, Map<string, unknown>> {
    const out = this.emptyData();
    for (const k of Object.keys(this.data) as TableName[])
      out[k] = new Map(structuredClone([...this.data[k]]));
    return out;
  }
}
