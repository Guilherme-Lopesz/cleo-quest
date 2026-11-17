/** Metadados do site, usados em layout, SEO e rodapé. */
export const SITE = {
  name: 'Cleo Quest',
  tagline: 'O mundinho da Cleo, também conhecida como Floquinha.',
  lang: 'pt-BR',
  repository: 'https://github.com/Guilherme-Lopesz/cleo-quest',
} as const;

/** Prefixa um caminho interno com o `base` configurado (necessário no GitHub Pages). */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}`;
}
