import { PNG } from 'pngjs';

export type RGBA = readonly [number, number, number, number];

/** Canvas de pixels com operações primitivas para pixel art determinística. */
export class PixelCanvas {
  readonly data: Uint8ClampedArray;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  px(x: number, y: number, c: RGBA | null): void {
    if (!c || x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const i = (Math.round(y) * this.width + Math.round(x)) * 4;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
    this.data[i + 3] = c[3];
  }

  get(x: number, y: number): RGBA | null {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
    const i = (y * this.width + x) * 4;
    const a = this.data[i + 3] ?? 0;
    if (a === 0) return null;
    return [this.data[i] ?? 0, this.data[i + 1] ?? 0, this.data[i + 2] ?? 0, a];
  }

  rect(x: number, y: number, w: number, h: number, c: RGBA): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }

  /** Elipse preenchida (centro cx,cy; raios rx,ry), com bordas discretas. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGBA): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.5);
        const dy = (y - cy) / (ry + 0.5);
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: RGBA): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Pinta a partir de uma "máscara" ASCII: cada caractere mapeia para uma cor. */
  stamp(x: number, y: number, rows: readonly string[], map: Record<string, RGBA>): void {
    rows.forEach((row, j) => {
      [...row].forEach((ch, i) => {
        const c = map[ch];
        if (c) this.px(x + i, y + j, c);
      });
    });
  }

  /** Contorno de 1px ao redor de todos os pixels opacos (estilo pixel art clássico). */
  outline(c: RGBA): void {
    const src = new Uint8ClampedArray(this.data);
    const has = (x: number, y: number) =>
      x >= 0 &&
      y >= 0 &&
      x < this.width &&
      y < this.height &&
      (src[(y * this.width + x) * 4 + 3] ?? 0) > 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (has(x, y)) continue;
        if (has(x - 1, y) || has(x + 1, y) || has(x, y - 1) || has(x, y + 1)) this.px(x, y, c);
      }
    }
  }

  /** Copia outro canvas por cima (alpha binário). */
  blit(other: PixelCanvas, dx = 0, dy = 0): void {
    for (let y = 0; y < other.height; y++) {
      for (let x = 0; x < other.width; x++) {
        const c = other.get(x, y);
        if (c) this.px(x + dx, y + dy, c);
      }
    }
  }

  toPNG(): Buffer {
    const png = new PNG({ width: this.width, height: this.height });
    png.data = Buffer.from(this.data.buffer, this.data.byteOffset, this.data.byteLength);
    return PNG.sync.write(png);
  }

  /** Versão ampliada (vizinho mais próximo) para inspeção visual. */
  scaled(factor: number): PixelCanvas {
    const out = new PixelCanvas(this.width * factor, this.height * factor);
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) {
        const c = this.get(x, y);
        if (c) out.rect(x * factor, y * factor, factor, factor, c);
      }
    return out;
  }
}
