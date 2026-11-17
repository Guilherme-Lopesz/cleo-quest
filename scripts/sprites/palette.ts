import type { RGBA } from './canvas';

const hex = (h: string, a = 255): RGBA => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
  a,
];

/**
 * Paleta da Cleo (Mestre §2.2 e §2.3): pelagem creme-acinzentada, marcas tabby
 * marrom-acinzentadas, nariz e orelhas rosados, peito branco, olhos azul-gelo,
 * colete teal.
 */
export const P = {
  outline: hex('#4A403A'),
  cream: hex('#E8DDC9'),
  creamShade: hex('#D2C5AE'),
  creamLight: hex('#F3EBDC'),
  gray: hex('#B9B2A8'),
  tabby: hex('#786D62'),
  tabbyDark: hex('#5E554C'),
  white: hex('#FFFDF9'),
  whiteShade: hex('#ECE6DA'),
  pink: hex('#E8B8B7'),
  pinkDark: hex('#D49A9A'),
  iceBlue: hex('#9FD3E6'),
  iceBlueDark: hex('#5FA9C9'),
  pupil: hex('#2B2F3A'),
  highlight: hex('#FFFFFF'),
  teal: hex('#65AFA5'),
  tealDark: hex('#4C8E86'),
  tealLight: hex('#8FCBC2'),
  gold: hex('#E4C25A'),
  goldDark: hex('#B8963A'),
  red: hex('#D9686B'),
  redDark: hex('#A94A4E'),
  navy: hex('#3E4C6B'),
  navyDark: hex('#2B3550'),
  yarnPink: hex('#E89AB5'),
  yarnDark: hex('#C76F91'),
  zzz: hex('#8FA3C9'),
  heart: hex('#E27A86'),
} as const;
