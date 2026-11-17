import {
  ok,
  SCHEMA_VERSION,
  type DomainError,
  type PlayerProfile,
  type Result,
  type StatisticsRecord,
} from '../contracts';
import { emptyStatistics } from '../domain/statistics-rules';
import type { CoreDeps } from './deps';
import { guarded } from './persistence-helpers';

export interface ProfileInit {
  profile: PlayerProfile;
  created: boolean;
}

/** Perfil, estatísticas, reset e backup. */
export class ProgressService {
  constructor(private readonly deps: CoreDeps) {}

  /** Garante o perfil local; devolve se é a primeira visita. */
  async ensureProfile(): Promise<
    Result<{ profile: PlayerProfile; created: boolean }, DomainError>
  > {
    const { store, clock } = this.deps;
    return guarded(() =>
      store.transaction(['profiles'], async (t) => {
        const existing = await t.profiles.get('main');
        if (existing) return ok<ProfileInit>({ profile: existing, created: false });
        const profile: PlayerProfile = {
          id: 'main',
          createdAt: clock.now().toISOString(),
          schemaVersion: SCHEMA_VERSION,
        };
        await t.profiles.put(profile);
        return ok<ProfileInit>({ profile, created: true });
      }),
    );
  }

  statistics(): Promise<StatisticsRecord> {
    return this.deps.store.read(
      ['statistics'],
      async (t) => (await t.statistics.get('main')) ?? emptyStatistics(),
    );
  }

  async resetAll(): Promise<void> {
    await this.deps.store.clear();
    this.deps.bus.publish({ type: 'ProgressReset' });
  }

  exportBackup(): Promise<Record<string, unknown[]>> {
    return this.deps.store.exportAll();
  }
}
