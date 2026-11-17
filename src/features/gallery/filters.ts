/** Filtra os cartões no DOM por fase e tag; devolve quantos ficaram visíveis. */
export function applyFilters(root: ParentNode, phase: string, tag: string): number {
  let visible = 0;
  for (const el of root.querySelectorAll<HTMLElement>('[data-photo-id]')) {
    const okPhase = !phase || el.dataset['phase'] === phase;
    const okTag = !tag || (el.dataset['tags'] ?? '').split(' ').includes(tag);
    const show = okPhase && okTag;
    el.hidden = !show;
    if (show) visible += 1;
  }
  return visible;
}
