import { CLEO_SPRITES } from './manifest.generated';
import { outfitLayers, type Outfit, type SpriteLayer } from './outfit';

/**
 * Renderiza a Cleo em DOM por camadas de spritesheet (sem canvas). Cada camada
 * é um <span> com a mesma imagem de fundo deslocada para o frame atual.
 */
export class SpriteView {
  readonly element: HTMLElement;
  private readonly layerEls = new Map<SpriteLayer, HTMLSpanElement>();
  private animation: keyof typeof CLEO_SPRITES.animations = 'idle';
  private frame = 0;

  constructor(
    private readonly assetBase: string,
    private outfit: Outfit,
    scale = 3,
  ) {
    const { frameWidth, frameHeight } = CLEO_SPRITES;
    this.element = document.createElement('span');
    this.element.className = 'cleo-sprite pixel';
    this.element.style.setProperty('--w', `${frameWidth}px`);
    this.element.style.setProperty('--h', `${frameHeight}px`);
    this.element.style.setProperty('--sprite-scale', String(scale));
    this.setOutfit(outfit);
  }

  setOutfit(outfit: Outfit): void {
    this.outfit = outfit;
    const wanted = outfitLayers(outfit);
    for (const [layer, el] of this.layerEls) {
      if (!wanted.includes(layer)) {
        el.remove();
        this.layerEls.delete(layer);
      }
    }
    wanted.forEach((layer, index) => {
      let el = this.layerEls.get(layer);
      if (!el) {
        el = document.createElement('span');
        el.className = 'cleo-sprite__layer';
        el.dataset['layer'] = layer;
        el.style.backgroundImage = `url(${this.assetBase}/pixel-art/cleo/${layer}.png)`;
        this.layerEls.set(layer, el);
      }
      el.style.zIndex = String(index);
      this.element.appendChild(el);
    });
    this.paint();
  }

  getOutfit(): Outfit {
    return this.outfit;
  }

  setFrame(animation: keyof typeof CLEO_SPRITES.animations, frame: number): void {
    if (animation === this.animation && frame === this.frame) return;
    this.animation = animation;
    this.frame = frame;
    this.paint();
  }

  setFacing(facing: 1 | -1): void {
    this.element.style.setProperty('--facing', String(facing));
  }

  private paint(): void {
    const anim = CLEO_SPRITES.animations[this.animation];
    const col = Math.min(this.frame, anim.frames - 1);
    const x = -col * CLEO_SPRITES.frameWidth;
    const y = -anim.row * CLEO_SPRITES.frameHeight;
    for (const el of this.layerEls.values()) el.style.backgroundPosition = `${x}px ${y}px`;
  }
}
