import {
  PREFERENCES_KEY,
  applyPreferences,
  defaultPreferences,
  loadPreferences,
  savePreferences,
  type KeyValueStorage,
} from '@/features/preferences/preferences';

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
}

describe('preferences', () => {
  it('retorna defaults sem dados', () => {
    expect(loadPreferences(memoryStorage())).toEqual(defaultPreferences);
    expect(defaultPreferences.muted).toBe(true);
  });

  it('ignora JSON inválido ou corrompido sem quebrar', () => {
    expect(loadPreferences(memoryStorage({ [PREFERENCES_KEY]: '{nope' }))).toEqual(
      defaultPreferences,
    );
    expect(loadPreferences(memoryStorage({ [PREFERENCES_KEY]: '{"theme":"neon"}' }))).toEqual(
      defaultPreferences,
    );
  });

  it('salva um patch preservando o resto', () => {
    const s = memoryStorage();
    savePreferences({ theme: 'soneca' }, s);
    const after = savePreferences({ volume: 0.2 }, s);
    expect(after.theme).toBe('soneca');
    expect(after.volume).toBe(0.2);
    expect(loadPreferences(s)).toEqual(after);
  });

  it('aplica tema e movimento no elemento raiz', () => {
    const root = document.createElement('html');
    applyPreferences({ ...defaultPreferences, theme: 'soneca', motion: 'reduced' }, root);
    expect(root.dataset['theme']).toBe('soneca');
    expect(root.dataset['motion']).toBe('reduced');
    applyPreferences(defaultPreferences, root);
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(root.hasAttribute('data-motion')).toBe(false);
  });
});
