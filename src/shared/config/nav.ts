export interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: string; // emoji simples; sem dependência de ícones externos
}

export const NAV: NavItem[] = [
  { href: '/', label: 'Início', short: 'Início', icon: '🏠' },
  { href: '/historia', label: 'História', short: 'História', icon: '📖' },
  { href: '/galeria', label: 'Galeria', short: 'Galeria', icon: '📷' },
  { href: '/parque', label: 'Parque de diversões', short: 'Parque', icon: '🎮' },
  { href: '/loja', label: 'Loja', short: 'Loja', icon: '🛍️' },
  { href: '/inventario', label: 'Inventário', short: 'Itens', icon: '🎒' },
  { href: '/casinha', label: 'Casinha da Cleo', short: 'Casinha', icon: '🏡' },
  { href: '/conquistas', label: 'Conquistas', short: 'Conquistas', icon: '🏅' },
];
