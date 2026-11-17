interface LightboxPhoto {
  id: string;
  src: string;
  alt: string;
  caption: string;
  date: string;
  width: number;
  height: number;
}

const formatDate = (iso: string): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const months = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
  ];
  const mm = months[Number(m) - 1] ?? '';
  return d ? `${d} ${mm} ${y}` : `${mm} ${y}`;
};

/**
 * Comportamento do lightbox. Os botões `[data-lightbox-open]` carregam o índice
 * da foto; a ordem visível (após filtros) é lida do DOM a cada abertura.
 */
export function mountLightbox(): void {
  const dialog = document.getElementById('lightbox') as HTMLDialogElement | null;
  const dataEl = document.getElementById('lightbox-data');
  if (!dialog || !dataEl) return;
  const photos = JSON.parse(dataEl.textContent ?? '[]') as LightboxPhoto[];
  const byId = new Map(photos.map((p) => [p.id, p]));

  const img = dialog.querySelector<HTMLImageElement>('[data-lightbox-img]')!;
  const caption = dialog.querySelector('[data-lightbox-caption]')!;
  const meta = dialog.querySelector('[data-lightbox-meta]')!;
  const counter = dialog.querySelector('[data-lightbox-counter]')!;
  const prevBtn = dialog.querySelector<HTMLButtonElement>('[data-lightbox-prev]')!;
  const nextBtn = dialog.querySelector<HTMLButtonElement>('[data-lightbox-next]')!;
  const closeBtn = dialog.querySelector<HTMLButtonElement>('[data-lightbox-close]')!;

  let order: string[] = [];
  let current = 0;
  let opener: HTMLElement | null = null;

  const visibleOrder = (): string[] =>
    [...document.querySelectorAll<HTMLElement>('[data-photo-id]')]
      .filter((el) => !el.hidden)
      .map((el) => el.dataset['photoId']!)
      .filter((id) => byId.has(id));

  const show = (index: number) => {
    if (order.length === 0) return;
    current = (index + order.length) % order.length;
    const p = byId.get(order[current]!)!;
    img.src = p.src;
    img.alt = p.alt;
    img.width = p.width;
    img.height = p.height;
    caption.textContent = p.caption || p.alt;
    meta.textContent = formatDate(p.date);
    counter.textContent = `${current + 1} de ${order.length}`;
    document.dispatchEvent(new CustomEvent('cleo:photo-viewed', { detail: { id: p.id } }));
  };

  const open = (id: string, trigger: HTMLElement) => {
    order = visibleOrder();
    const idx = Math.max(0, order.indexOf(id));
    opener = trigger;
    show(idx);
    if (!dialog.open) dialog.showModal();
    closeBtn.focus();
  };

  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-lightbox-open]');
    if (!btn) return;
    const id = btn.closest<HTMLElement>('[data-photo-id]')?.dataset['photoId'];
    if (id) open(id, btn);
  });

  prevBtn.addEventListener('click', () => show(current - 1));
  nextBtn.addEventListener('click', () => show(current + 1));
  closeBtn.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close(); // clique no backdrop
  });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
  dialog.addEventListener('close', () => {
    img.removeAttribute('src');
    opener?.focus();
  });
}
