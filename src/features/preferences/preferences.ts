import { z } from 'zod';

/**
 * Preferências leves (SAD §9.1): tema, som, movimento. Vivem no localStorage,
 * fora do IndexedDB, e são lidas antes da primeira pintura para evitar flash.
 */
export const PreferencesSchema = z.object({
  theme: z.enum(['system', 'light', 'soneca']).default('system'),
  muted: z.boolean().default(true),
  volume: z.number().min(0).max(1).default(0.6),
  motion: z.enum(['system', 'reduced']).default('system'),
  onboardingVersion: z.number().int().nonnegative().default(0),
});
export type Preferences = z.infer<typeof PreferencesSchema>;

export const PREFERENCES_KEY = 'cleo-quest:preferences';
export const PREFERENCES_EVENT = 'cleo:preferences-changed';

export const defaultPreferences: Preferences = PreferencesSchema.parse({});

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function safeStorage(): KeyValueStorage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function loadPreferences(storage: KeyValueStorage | null = safeStorage()): Preferences {
  if (!storage) return defaultPreferences;
  try {
    const raw = storage.getItem(PREFERENCES_KEY);
    if (!raw) return defaultPreferences;
    const parsed: unknown = JSON.parse(raw);
    const result = PreferencesSchema.safeParse(parsed);
    return result.success ? result.data : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(
  patch: Partial<Preferences>,
  storage: KeyValueStorage | null = safeStorage(),
): Preferences {
  const next = PreferencesSchema.parse({ ...loadPreferences(storage), ...patch });
  try {
    storage?.setItem(PREFERENCES_KEY, JSON.stringify(next));
  } catch {
    // quota ou modo privado: preferências ficam apenas em memória nesta visita
  }
  if (typeof document !== 'undefined') {
    applyPreferences(next, document.documentElement);
    document.dispatchEvent(new CustomEvent(PREFERENCES_EVENT, { detail: next }));
  }
  return next;
}

/** Reflete tema e movimento no <html> para o CSS reagir. */
export function applyPreferences(prefs: Preferences, root: HTMLElement): void {
  if (prefs.theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', prefs.theme);
  if (prefs.motion === 'reduced') root.setAttribute('data-motion', 'reduced');
  else root.removeAttribute('data-motion');
}

/** Verdadeiro quando animações devem ser mínimas (preferência do site ou do sistema). */
export function prefersReducedMotion(prefs: Preferences = loadPreferences()): boolean {
  if (prefs.motion === 'reduced') return true;
  if (typeof matchMedia === 'undefined') return false;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Tema efetivo considerando a preferência do sistema. */
export function effectiveTheme(prefs: Preferences = loadPreferences()): 'light' | 'soneca' {
  if (prefs.theme !== 'system') return prefs.theme;
  if (typeof matchMedia === 'undefined') return 'light';
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'soneca' : 'light';
}
