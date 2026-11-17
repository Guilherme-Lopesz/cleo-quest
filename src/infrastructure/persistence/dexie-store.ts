import Dexie from 'dexie';
import type { KeyedTable, ProgressStore, ProgressTables, TableName } from '@core/contracts';
import { PersistenceError, TABLE_SCHEMAS } from '@core/contracts';
import { CleoDatabase } from './dexie-db';

/**
 * Porta de persistência sobre IndexedDB via Dexie (SAD §9). Cada leitura passa
 * pelo schema Zod da tabela; dado inválido aborta a operação com CORRUPT e
 * nunca é sobrescrito silenciosamente.
 */
export class DexieProgressStore implements ProgressStore {
  readonly db: CleoDatabase;

  constructor(db: CleoDatabase = new CleoDatabase()) {
    this.db = db;
  }

  private wrap<T>(name: TableName): KeyedTable<T> {
    const table = this.db.table(name);
    const schema = TABLE_SCHEMAS[name];
    const validate = (value: unknown): T => {
      const r = schema.safeParse(value);
      if (!r.success) {
        throw new PersistenceError(
          `Dados inválidos em "${name}": ${r.error.issues[0]?.message ?? 'schema'}`,
          'CORRUPT',
          r.error,
        );
      }
      return r.data as T;
    };
    return {
      get: async (key) => {
        const v: unknown = await table.get(key);
        return v === undefined ? undefined : validate(v);
      },
      put: async (value) => {
        await table.put(validate(value));
      },
      delete: async (key) => {
        await table.delete(key);
      },
      list: async () => ((await table.toArray()) as unknown[]).map(validate),
    };
  }

  private tables(): ProgressTables {
    return {
      profiles: this.wrap('profiles'),
      wallet: this.wrap('wallet'),
      sessions: this.wrap('sessions'),
      inventory: this.wrap('inventory'),
      purchases: this.wrap('purchases'),
      rewardClaims: this.wrap('rewardClaims'),
      achievements: this.wrap('achievements'),
      statistics: this.wrap('statistics'),
      customization: this.wrap('customization'),
      house: this.wrap('house'),
    };
  }

  private translate(e: unknown): never {
    if (e instanceof PersistenceError) throw e;
    if (e instanceof Dexie.DexieError || (e instanceof Error && 'name' in e)) {
      const name = e.name;
      if (name === 'QuotaExceededError')
        throw new PersistenceError('Armazenamento do navegador cheio.', 'QUOTA', e);
      if (
        name === 'OpenFailedError' ||
        name === 'InvalidStateError' ||
        name === 'MissingAPIError' ||
        name === 'DatabaseClosedError'
      ) {
        throw new PersistenceError('IndexedDB indisponível neste navegador.', 'UNAVAILABLE', e);
      }
      if (name === 'VersionError' || name === 'UpgradeError') {
        throw new PersistenceError(
          'Banco local incompatível com esta versão do site.',
          'CORRUPT',
          e,
        );
      }
    }
    throw e;
  }

  async transaction<T>(
    tables: readonly TableName[],
    fn: (t: ProgressTables) => Promise<T>,
  ): Promise<T> {
    try {
      const scope = tables.map((n) => this.db.table(n));
      return await this.db.transaction('rw', scope, () => fn(this.tables()));
    } catch (e) {
      this.translate(e);
    }
  }

  async read<T>(tables: readonly TableName[], fn: (t: ProgressTables) => Promise<T>): Promise<T> {
    try {
      const scope = tables.map((n) => this.db.table(n));
      return await this.db.transaction('r', scope, () => fn(this.tables()));
    } catch (e) {
      this.translate(e);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.db.transaction('rw', this.db.tables, async () => {
        await Promise.all(this.db.tables.map((t) => t.clear()));
      });
    } catch (e) {
      this.translate(e);
    }
  }

  async exportAll(): Promise<Record<TableName, unknown[]>> {
    const out = {} as Record<TableName, unknown[]>;
    for (const t of this.db.tables) out[t.name as TableName] = (await t.toArray()) as unknown[];
    return out;
  }

  static isSupported(): boolean {
    try {
      return typeof indexedDB !== 'undefined' && indexedDB !== null;
    } catch {
      return false;
    }
  }
}
