import { PixelCanvas } from './canvas';
import { P } from './palette';

export type Stance = 'stand' | 'sit' | 'lie';
export type Eyes = 'open' | 'closed' | 'happy' | 'angry' | 'wide' | 'half';
export type Mouth = 'none' | 'smile' | 'open' | 'frown' | 'tongue';
export type Tail = 'up' | 'curl' | 'swishA' | 'swishB' | 'wrap' | 'down';
export type Layer = 'base' | 'vest' | 'crown' | 'hat' | 'bow' | 'tie' | 'fx';

export interface Pose {
  stance: Stance;
  bodyDy?: number;
  headDx?: number;
  headDy?: number;
  /** Balanço horizontal de cada perna (px): [trásA, trásB, frenteA, frenteB]. */
  legs?: [number, number, number, number];
  /** Pata dianteira levantada (arranhar / brincar). */
  pawUp?: boolean;
  earsBack?: boolean;
  eyes?: Eyes;
  mouth?: Mouth;
  tail?: Tail;
  fx?: 'zzz' | 'hearts' | 'sparkles' | 'anger' | 'music' | 'none';
}

export const FRAME = 32;

/** Pontos de referência da pose — compartilhados por todas as camadas. */
interface Geometry {
  headCx: number;
  headCy: number;
  headR: number;
  bodyCx: number;
  bodyCy: number;
  bodyRx: number;
  bodyRy: number;
  neckX: number;
  neckY: number;
  ground: number;
}

function geometry(pose: Pose): Geometry {
  const bdy = pose.bodyDy ?? 0;
  const hdx = pose.headDx ?? 0;
  const hdy = pose.headDy ?? 0;
  switch (pose.stance) {
    case 'stand':
      return {
        headCx: 23 + hdx,
        headCy: 12 + hdy + bdy,
        headR: 6,
        bodyCx: 15,
        bodyCy: 20 + bdy,
        bodyRx: 8,
        bodyRy: 5,
        neckX: 19,
        neckY: 16 + bdy,
        ground: 28,
      };
    case 'sit':
      return {
        headCx: 19 + hdx,
        headCy: 10 + hdy + bdy,
        headR: 6,
        bodyCx: 16,
        bodyCy: 21 + bdy,
        bodyRx: 6,
        bodyRy: 6,
        neckX: 17,
        neckY: 15 + bdy,
        ground: 28,
      };
    case 'lie':
      return {
        headCx: 23 + hdx,
        headCy: 19 + hdy + bdy,
        headR: 5,
        bodyCx: 15,
        bodyCy: 23 + bdy,
        bodyRx: 10,
        bodyRy: 4,
        neckX: 19,
        neckY: 21 + bdy,
        ground: 28,
      };
  }
}

function drawTail(c: PixelCanvas, g: Geometry, tail: Tail, stance: Stance): void {
  const fur = P.cream;
  const ring = P.tabby;
  const baseX = g.bodyCx - g.bodyRx + 1;
  const baseY = g.bodyCy - 1;
  const seg = (pts: [number, number][]) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i]!;
      const [x1, y1] = pts[i + 1]!;
      c.line(x0, y0, x1, y1, fur);
      c.line(x0, y0 + 1, x1, y1 + 1, fur);
    }
    // anéis tabby: a cada 3 pixels ao longo do caminho
    pts.forEach(([x, y], i) => {
      if (i % 2 === 1) {
        c.px(x, y, ring);
        c.px(x, y + 1, ring);
      }
    });
    const [tx, ty] = pts[pts.length - 1]!;
    c.px(tx, ty, P.tabbyDark);
    c.px(tx, ty + 1, P.tabbyDark);
  };
  if (stance === 'lie' || tail === 'wrap') {
    // cauda enrolada à frente, no chão
    const y = g.ground - 2;
    const x0 = g.bodyCx - g.bodyRx;
    const x1 = Math.min(g.headCx + 2, FRAME - 3);
    seg([
      [x0, y],
      [x0 + 2, y + 1],
      [x0 + 5, y + 1],
      [x0 + 8, y + 1],
      [x1 - 3, y + 1],
      [x1, y],
    ]);
    return;
  }
  switch (tail) {
    case 'up':
      seg([
        [baseX, baseY],
        [baseX - 2, baseY - 2],
        [baseX - 3, baseY - 5],
        [baseX - 2, baseY - 8],
        [baseX, baseY - 10],
      ]);
      break;
    case 'curl':
      seg([
        [baseX, baseY],
        [baseX - 2, baseY - 2],
        [baseX - 4, baseY - 4],
        [baseX - 5, baseY - 7],
        [baseX - 3, baseY - 9],
        [baseX - 1, baseY - 8],
      ]);
      break;
    case 'swishA':
      seg([
        [baseX, baseY],
        [baseX - 3, baseY - 1],
        [baseX - 5, baseY - 3],
        [baseX - 6, baseY - 6],
        [baseX - 5, baseY - 9],
      ]);
      break;
    case 'swishB':
      seg([
        [baseX, baseY],
        [baseX - 2, baseY - 3],
        [baseX - 2, baseY - 6],
        [baseX - 1, baseY - 9],
        [baseX + 1, baseY - 11],
      ]);
      break;
    case 'down':
      seg([
        [baseX, baseY],
        [baseX - 2, baseY + 1],
        [baseX - 4, baseY + 3],
        [baseX - 5, baseY + 6],
      ]);
      break;
  }
}

function drawLegs(c: PixelCanvas, g: Geometry, pose: Pose): void {
  const [bA, bB, fA, fB] = pose.legs ?? [0, 0, 0, 0];
  const fur = P.cream;
  const shade = P.creamShade;
  const paw = P.creamLight;
  const leg = (x: number, top: number, dx: number, color: typeof fur) => {
    const h = g.ground - top;
    // perna reta com a pata deslocada no balanço da caminhada
    c.rect(x, top, 2, h - 2, color);
    c.rect(x + dx, g.ground - 2, 2, 1, color);
    c.rect(x + dx, g.ground - 1, 3, 1, paw);
  };
  if (pose.stance === 'stand') {
    const top = g.bodyCy + 2;
    leg(g.bodyCx - 6, top, bA, shade);
    leg(g.bodyCx - 3, top, bB, fur);
    if (pose.pawUp) {
      // pata dianteira levantada à frente da cabeça
      leg(g.bodyCx + 5, top, fA, shade);
      c.rect(g.neckX + 4, g.neckY - 2, 2, 5, fur);
      c.rect(g.neckX + 4, g.neckY - 3, 3, 1, paw);
    } else {
      leg(g.bodyCx + 4, top, fA, shade);
      leg(g.bodyCx + 7, top, fB, fur);
    }
  } else if (pose.stance === 'sit') {
    // patas dianteiras retas; coxa traseira arredondada
    c.ellipse(g.bodyCx - 3, g.bodyCy + 4, 4, 3, shade);
    c.rect(g.bodyCx + 2, g.bodyCy + 1, 2, g.ground - g.bodyCy - 1, fur);
    c.rect(g.bodyCx + 5, g.bodyCy + 1, 2, g.ground - g.bodyCy - 1, fur);
    c.rect(g.bodyCx + 2, g.ground - 1, 3, 1, paw);
    c.rect(g.bodyCx + 5, g.ground - 1, 3, 1, paw);
    c.rect(g.bodyCx - 5, g.ground - 1, 3, 1, paw);
    if (pose.pawUp) {
      c.rect(g.bodyCx + 7, g.bodyCy - 3, 2, 4, fur);
      c.rect(g.bodyCx + 7, g.bodyCy - 4, 3, 1, paw);
    }
  } else {
    // deitada: patas dobradas à frente
    c.rect(g.bodyCx + 6, g.ground - 3, 3, 2, fur);
    c.rect(g.bodyCx + 9, g.ground - 2, 2, 1, paw);
    c.rect(g.bodyCx - 7, g.ground - 2, 3, 1, shade);
  }
}

function drawBody(c: PixelCanvas, g: Geometry, pose: Pose): void {
  c.ellipse(g.bodyCx, g.bodyCy, g.bodyRx, g.bodyRy, P.cream);
  // barriga/sombra inferior
  c.ellipse(
    g.bodyCx,
    g.bodyCy + Math.floor(g.bodyRy / 2),
    g.bodyRx - 2,
    Math.max(1, g.bodyRy - 3),
    P.creamShade,
  );
  // marcas tabby no dorso
  const top = g.bodyCy - g.bodyRy;
  if (pose.stance === 'stand' || pose.stance === 'lie') {
    for (let i = 0; i < 3; i++) {
      const x = g.bodyCx - 4 + i * 3;
      c.rect(x, top + 1, 1, 2, P.tabby);
      c.px(x + 1, top + 3, P.gray);
    }
    c.rect(g.bodyCx - 5, top + 2, 1, 1, P.gray);
  } else {
    for (let i = 0; i < 3; i++) {
      c.rect(g.bodyCx - 5, g.bodyCy - 3 + i * 3, 2, 1, P.tabby);
    }
  }
  // peito branco (frente do corpo, abaixo do pescoço)
  if (pose.stance === 'stand') {
    c.ellipse(g.neckX + 1, g.neckY + 3, 3, 4, P.white);
    c.px(g.neckX - 1, g.neckY + 6, P.whiteShade);
  } else if (pose.stance === 'sit') {
    c.ellipse(g.bodyCx + 2, g.bodyCy - 1, 3, 5, P.white);
    c.rect(g.bodyCx, g.bodyCy + 3, 2, 1, P.whiteShade);
  } else {
    c.ellipse(g.neckX, g.neckY + 1, 3, 2, P.white);
  }
}

function drawHead(c: PixelCanvas, g: Geometry, pose: Pose): void {
  const { headCx: hx, headCy: hy, headR: r } = g;
  const eyes = pose.eyes ?? 'open';
  const mouth = pose.mouth ?? 'none';
  const earBack = pose.earsBack ?? false;
  const lie = pose.stance === 'lie';

  // orelhas (triângulos) com interior rosado
  const earTop = hy - r - (earBack ? 1 : 3);
  const earL = hx - r + 1;
  const earR = hx + r - 4;
  const earRows = earBack ? ['.x.', 'xxx', 'xxx'] : ['.x.', 'xpx', 'xpx', 'xppx'];
  const earMap = { x: P.cream, p: P.pink } as const;
  c.stamp(earL, earTop, earRows, earMap);
  c.stamp(earR, earTop, earRows, earMap);
  c.px(earL + 1, earTop + 1, P.pinkDark);
  c.px(earR + 1, earTop + 1, P.pinkDark);

  // cabeça
  c.ellipse(hx, hy, r, r - (lie ? 1 : 0), P.cream);
  // bochechas ligeiramente mais claras / focinho branco
  c.ellipse(hx + 1, hy + 3, 4, 2, P.white);
  // "M" tabby na testa
  const fy = hy - r + 1;
  c.rect(hx - 3, fy, 1, 3, P.tabby);
  c.rect(hx, fy - 1, 1, 3, P.tabby);
  c.rect(hx + 3, fy, 1, 3, P.tabby);
  c.px(hx - 2, fy + 2, P.gray);
  c.px(hx + 2, fy + 2, P.gray);
  // riscas nas bochechas
  c.rect(hx - r + 1, hy + 1, 2, 1, P.tabby);
  c.rect(hx + r - 2, hy + 1, 2, 1, P.tabby);

  // olhos azul-gelo
  const ey = hy - 1;
  const exL = hx - 3;
  const exR = hx + 2;
  const eye = (x: number) => {
    switch (eyes) {
      case 'open':
        c.rect(x, ey, 2, 2, P.iceBlue);
        c.px(x + 1, ey + 1, P.pupil);
        c.px(x, ey, P.highlight);
        break;
      case 'wide':
        c.rect(x, ey - 1, 2, 3, P.iceBlue);
        c.px(x + 1, ey, P.pupil);
        c.px(x, ey - 1, P.highlight);
        break;
      case 'half':
        c.rect(x, ey + 1, 2, 1, P.iceBlueDark);
        c.rect(x, ey, 2, 1, P.tabbyDark);
        break;
      case 'closed':
        c.rect(x, ey + 1, 2, 1, P.tabbyDark);
        break;
      case 'happy':
        c.px(x, ey + 1, P.tabbyDark);
        c.px(x + 1, ey, P.tabbyDark);
        c.px(x + 2, ey + 1, P.tabbyDark);
        break;
      case 'angry':
        c.rect(x, ey, 2, 2, P.iceBlueDark);
        c.px(x + 1, ey + 1, P.pupil);
        break;
    }
  };
  eye(exL);
  eye(exR);
  if (eyes === 'angry') {
    // sobrancelhas franzidas
    c.px(exL - 1, ey - 1, P.tabbyDark);
    c.px(exL, ey - 1, P.tabbyDark);
    c.px(exR + 1, ey - 1, P.tabbyDark);
    c.px(exR + 2, ey - 1, P.tabbyDark);
  }

  // nariz rosado e boca
  const ny = hy + 2;
  c.rect(hx, ny, 2, 1, P.pink);
  c.px(hx, ny, P.pinkDark);
  switch (mouth) {
    case 'smile':
      c.px(hx - 1, ny + 2, P.tabbyDark);
      c.px(hx, ny + 1, P.tabbyDark);
      c.px(hx + 1, ny + 1, P.tabbyDark);
      c.px(hx + 2, ny + 2, P.tabbyDark);
      break;
    case 'open':
      c.rect(hx, ny + 1, 2, 2, P.tabbyDark);
      c.px(hx, ny + 2, P.pinkDark);
      break;
    case 'frown':
      c.px(hx - 1, ny + 1, P.tabbyDark);
      c.px(hx, ny + 2, P.tabbyDark);
      c.px(hx + 1, ny + 2, P.tabbyDark);
      c.px(hx + 2, ny + 1, P.tabbyDark);
      break;
    case 'tongue':
      c.px(hx, ny + 1, P.tabbyDark);
      c.px(hx + 1, ny + 1, P.tabbyDark);
      c.px(hx + 1, ny + 2, P.pinkDark);
      break;
    case 'none':
      c.px(hx, ny + 1, P.tabbyDark);
      c.px(hx + 1, ny + 1, P.tabbyDark);
      break;
  }
  // bigodes
  c.px(hx - r, ny, P.whiteShade);
  c.px(hx + r, ny, P.whiteShade);
}

function drawVest(c: PixelCanvas, g: Geometry, pose: Pose): void {
  const mask = new PixelCanvas(FRAME, FRAME);
  if (pose.stance === 'stand') {
    mask.ellipse(g.bodyCx, g.bodyCy, g.bodyRx, g.bodyRy, P.teal);
    // colete cobre o dorso e as laterais; deixa a barriga e o peito à mostra
    for (let y = 0; y < FRAME; y++)
      for (let x = 0; x < FRAME; x++) {
        const inside = mask.get(x, y);
        if (!inside) continue;
        const front = x > g.neckX + 1;
        const belly = y > g.bodyCy + 2;
        if (front || belly) continue;
        c.px(x, y, P.teal);
      }
    c.rect(g.bodyCx - 4, g.bodyCy - g.bodyRy + 1, 1, 6, P.tealLight);
    c.line(g.neckX + 1, g.bodyCy - g.bodyRy + 1, g.neckX + 1, g.bodyCy + 2, P.tealDark);
    c.rect(g.bodyCx - g.bodyRx + 1, g.bodyCy + 2, g.neckX - (g.bodyCx - g.bodyRx), 1, P.tealDark);
    c.px(g.neckX, g.bodyCy, P.gold); // botão
  } else if (pose.stance === 'sit') {
    mask.ellipse(g.bodyCx, g.bodyCy, g.bodyRx, g.bodyRy, P.teal);
    for (let y = 0; y < FRAME; y++)
      for (let x = 0; x < FRAME; x++) {
        const inside = mask.get(x, y);
        if (!inside) continue;
        const front = x > g.bodyCx; // frente aberta mostra o peito branco
        const low = y > g.bodyCy + 3;
        if (front || low) continue;
        c.px(x, y, P.teal);
      }
    c.line(g.bodyCx, g.bodyCy - g.bodyRy + 1, g.bodyCx, g.bodyCy + 3, P.tealDark);
    c.rect(g.bodyCx - g.bodyRx + 1, g.bodyCy + 3, g.bodyRx, 1, P.tealDark);
    c.px(g.bodyCx - 1, g.bodyCy - 1, P.gold);
  } else {
    mask.ellipse(g.bodyCx, g.bodyCy, g.bodyRx, g.bodyRy, P.teal);
    for (let y = 0; y < FRAME; y++)
      for (let x = 0; x < FRAME; x++) {
        if (!mask.get(x, y)) continue;
        if (x > g.neckX - 1 || y > g.bodyCy + 1) continue;
        c.px(x, y, P.teal);
      }
    c.rect(g.bodyCx - g.bodyRx + 2, g.bodyCy + 1, g.neckX - g.bodyCx + g.bodyRx - 3, 1, P.tealDark);
  }
}

function drawCrown(c: PixelCanvas, g: Geometry, pose: Pose): void {
  const y = g.headCy - g.headR - (pose.earsBack ? 1 : 3);
  const x = g.headCx - 2;
  c.stamp(x, y - 3, ['g.g.g', 'ggggg', 'grgbg', 'ggggg'], {
    g: P.gold,
    r: P.red,
    b: P.iceBlueDark,
  });
  c.px(x, y, P.goldDark);
  c.px(x + 4, y, P.goldDark);
}

function drawHat(c: PixelCanvas, g: Geometry, pose: Pose): void {
  const y = g.headCy - g.headR - (pose.earsBack ? 1 : 3);
  const x = g.headCx - 4;
  // cartola compacta
  c.stamp(x, y - 5, ['..nnnn..', '..nnnn..', '..nnnn..', '..rrrr..', 'nnnnnnnn'], {
    n: P.navy,
    r: P.red,
  });
  c.rect(x + 2, y - 5, 1, 3, P.navyDark);
}

function drawBow(c: PixelCanvas, g: Geometry, pose: Pose): void {
  // laço perto da orelha direita
  const y = g.headCy - g.headR - (pose.earsBack ? 0 : 1);
  const x = g.headCx + g.headR - 5;
  c.stamp(x, y - 1, ['r.r', 'rRr', 'r.r'], { r: P.red, R: P.redDark });
}

function drawTie(c: PixelCanvas, g: Geometry, pose: Pose): void {
  // gravata no pescoço, sobre o peito branco
  const x = pose.stance === 'sit' ? g.bodyCx + 2 : g.neckX + 1;
  const y = pose.stance === 'sit' ? g.bodyCy - 3 : g.neckY + 1;
  c.stamp(x, y, ['rr', '.r', 'rr', 'rr', '.r'], { r: P.red });
  c.px(x, y + 2, P.redDark);
}

function drawFx(c: PixelCanvas, g: Geometry, pose: Pose, phase: number): void {
  const fx = pose.fx ?? 'none';
  const x = Math.min(g.headCx + g.headR - 1, FRAME - 6);
  const y = Math.max(1, g.headCy - g.headR - 6);
  switch (fx) {
    case 'zzz': {
      const z = ['zzz', '..z', '.z.', 'zzz'];
      c.stamp(x + (phase % 2), y + 2 - phase, z, { z: P.zzz });
      if (phase > 0) c.stamp(x + 3, y - 1, ['zz', '.z', 'zz'], { z: P.zzz });
      break;
    }
    case 'hearts':
      c.stamp(x - 1, y + 1 - phase, ['h.h', 'hhh', '.h.'], { h: P.heart });
      if (phase > 0) c.stamp(x + 3, y - 1, ['h.h', 'hhh', '.h.'], { h: P.heart });
      break;
    case 'sparkles':
      c.stamp(x, y + phase, ['.s.', 'sss', '.s.'], { s: P.gold });
      c.px(x - 3, y + 4 - phase, P.gold);
      break;
    case 'anger':
      c.stamp(x, y + 2, ['a..a', '.aa.', '.aa.', 'a..a'], { a: P.red });
      break;
    case 'music':
      c.stamp(x, y + 1 - phase, ['.mm', '.m.', 'mm.'], { m: P.navy });
      break;
    case 'none':
      break;
  }
}

/** Desenha uma camada da Cleo para a pose. `phase` anima os efeitos. */
export function drawCleo(pose: Pose, layer: Layer, phase = 0): PixelCanvas {
  const c = new PixelCanvas(FRAME, FRAME);
  const g = geometry(pose);
  switch (layer) {
    case 'base': {
      drawTail(c, g, pose.tail ?? 'up', pose.stance);
      drawLegs(c, g, pose);
      drawBody(c, g, pose);
      drawHead(c, g, pose);
      c.outline(P.outline);
      break;
    }
    case 'vest':
      drawVest(c, g, pose);
      break;
    case 'crown':
      drawCrown(c, g, pose);
      break;
    case 'hat':
      drawHat(c, g, pose);
      break;
    case 'bow':
      drawBow(c, g, pose);
      break;
    case 'tie':
      drawTie(c, g, pose);
      break;
    case 'fx':
      drawFx(c, g, pose, phase);
      break;
  }
  return c;
}
