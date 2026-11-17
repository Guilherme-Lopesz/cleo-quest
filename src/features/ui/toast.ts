/** Notificações acessíveis (região aria-live no layout). */
export function toast(
  message: string,
  kind: 'info' | 'success' | 'danger' = 'info',
  ms = 3500,
): void {
  const host = document.getElementById('toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = `toast toast--${kind}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), ms);
}
