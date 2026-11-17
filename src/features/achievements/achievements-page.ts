import { getGameCore } from '@/features/game-core';
import { ACHIEVEMENTS, EASTER_EGGS } from '@core/config/achievements';
import { toast } from '@/features/ui/toast';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

export async function mountAchievements(): Promise<void> {
  const grid = document.getElementById('ach-grid');
  const summary = document.getElementById('ach-summary');
  if (!grid || !summary) return;
  const core = await getGameCore();

  const render = async () => {
    const [records, stats] = await Promise.all([
      core.achievements.listRecords(),
      core.progress.statistics(),
    ]);
    const byId = new Map(records.map((r) => [r.achievementId as string, r]));
    let unlocked = 0;
    for (const def of ACHIEVEMENTS) {
      const card = grid.querySelector<HTMLElement>(`[data-achievement-id="${def.id}"]`);
      if (!card) continue;
      const rec = byId.get(def.id);
      const done = Boolean(rec?.unlockedAt);
      if (done) unlocked += 1;
      card.dataset['state'] = done ? 'unlocked' : 'locked';
      if (def.secret && done) {
        card.querySelector('[data-title]')!.textContent = def.title;
        card.querySelector('[data-desc]')!.textContent = def.description;
      }
      const date = card.querySelector<HTMLElement>('[data-date]');
      if (date) {
        date.hidden = !done;
        if (rec?.unlockedAt) date.textContent = `Desbloqueada em ${fmtDate(rec.unlockedAt)}`;
      }
      if (def.target) {
        const progress = Math.min(def.target, rec?.progress ?? 0);
        const bar = card.querySelector<HTMLElement>('.ach__bar');
        const pb = card.querySelector<HTMLElement>('.ach__progress');
        if (bar) bar.style.width = `${(progress / def.target) * 100}%`;
        pb?.setAttribute('aria-valuenow', String(progress));
        card.querySelector('[data-count]')!.textContent = `${progress}/${def.target}`;
      }
    }
    summary.textContent = `${unlocked} de ${ACHIEVEMENTS.length} conquistas desbloqueadas.`;
    for (const el of document.querySelectorAll<HTMLElement>('[data-stat]')) {
      const key = el.dataset['stat'] as keyof typeof stats | 'eggs';
      if (key === 'eggs') el.textContent = `${stats.easterEggsFound.length}/${EASTER_EGGS.length}`;
      else {
        const v = stats[key];
        el.textContent = typeof v === 'number' ? v.toLocaleString('pt-BR') : '0';
      }
    }
    for (const el of document.querySelectorAll<HTMLElement>('[data-best]')) {
      const best = stats.bestScores[el.dataset['best'] ?? ''];
      el.textContent = best !== undefined ? String(best) : '—';
    }
  };
  await render();
  core.bus.onAny(() => void render());

  document.getElementById('export-backup')?.addEventListener('click', async () => {
    const data = await core.progress.exportBackup();
    const blob = new Blob(
      [JSON.stringify({ app: 'cleo-quest', exportedAt: new Date().toISOString(), data }, null, 2)],
      {
        type: 'application/json',
      },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleo-quest-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Backup exportado. Guarde com carinho.', 'success');
  });
}
