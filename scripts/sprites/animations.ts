import type { Pose } from './cleo';

export interface AnimationDef {
  name: string;
  fps: number;
  loop: boolean;
  frames: Pose[];
}

const stand = (p: Partial<Pose> = {}): Pose => ({ stance: 'stand', tail: 'up', ...p });
const sit = (p: Partial<Pose> = {}): Pose => ({ stance: 'sit', tail: 'curl', ...p });
const lie = (p: Partial<Pose> = {}): Pose => ({ stance: 'lie', tail: 'wrap', ...p });

/** Estados da FSM da personagem (Mestre §7.1), com frames por estado. */
export const ANIMATIONS: AnimationDef[] = [
  {
    name: 'idle',
    fps: 2,
    loop: true,
    frames: [stand(), stand({ tail: 'swishB' }), stand(), stand({ tail: 'swishA' })],
  },
  {
    name: 'blink',
    fps: 8,
    loop: false,
    frames: [stand({ eyes: 'half' }), stand({ eyes: 'closed' }), stand({ eyes: 'half' })],
  },
  {
    name: 'walk',
    fps: 8,
    loop: true,
    frames: [
      stand({ legs: [1, -1, -1, 1], tail: 'swishA' }),
      stand({ bodyDy: -1, tail: 'up' }),
      stand({ legs: [-1, 1, 1, -1], tail: 'swishB' }),
      stand({ bodyDy: -1, tail: 'up' }),
    ],
  },
  {
    name: 'sitting',
    fps: 2,
    loop: true,
    frames: [sit(), sit({ eyes: 'half' }), sit(), sit({ tail: 'swishA' })],
  },
  {
    name: 'sleeping',
    fps: 1,
    loop: true,
    frames: [
      lie({ eyes: 'closed', fx: 'zzz' }),
      lie({ eyes: 'closed', bodyDy: -1, fx: 'zzz', earsBack: true }),
    ],
  },
  {
    name: 'happy',
    fps: 6,
    loop: false,
    frames: [
      stand({ eyes: 'happy', mouth: 'smile', fx: 'hearts', bodyDy: -1, tail: 'up' }),
      stand({ eyes: 'happy', mouth: 'smile', fx: 'hearts', tail: 'swishB' }),
      stand({ eyes: 'happy', mouth: 'smile', fx: 'hearts', bodyDy: -1, tail: 'up' }),
      stand({ eyes: 'happy', mouth: 'smile', fx: 'hearts', tail: 'swishA' }),
    ],
  },
  {
    name: 'angry',
    fps: 6,
    loop: false,
    frames: [
      stand({ eyes: 'angry', mouth: 'frown', earsBack: true, fx: 'anger', tail: 'swishA' }),
      stand({ eyes: 'angry', mouth: 'open', earsBack: true, fx: 'anger', tail: 'swishB' }),
      stand({ eyes: 'angry', mouth: 'frown', earsBack: true, fx: 'anger', tail: 'swishA' }),
    ],
  },
  {
    name: 'scratch',
    fps: 8,
    loop: false,
    frames: [
      stand({ pawUp: true, eyes: 'wide', tail: 'swishA' }),
      stand({ pawUp: true, eyes: 'wide', headDy: 1, tail: 'swishB' }),
      stand({ pawUp: true, eyes: 'wide', tail: 'swishA' }),
      stand({ eyes: 'open', tail: 'up' }),
    ],
  },
  {
    name: 'surprised',
    fps: 6,
    loop: false,
    frames: [
      stand({ eyes: 'wide', mouth: 'open', bodyDy: -2, earsBack: false, tail: 'up' }),
      stand({ eyes: 'wide', mouth: 'open', tail: 'swishB' }),
    ],
  },
  {
    name: 'sad',
    fps: 2,
    loop: false,
    frames: [
      sit({ eyes: 'half', mouth: 'frown', earsBack: true, tail: 'down' }),
      sit({ eyes: 'closed', mouth: 'frown', earsBack: true, tail: 'down' }),
    ],
  },
  {
    name: 'eating',
    fps: 6,
    loop: false,
    frames: [
      sit({ headDy: 2, mouth: 'open', eyes: 'half' }),
      sit({ headDy: 3, mouth: 'none', eyes: 'closed' }),
      sit({ headDy: 2, mouth: 'open', eyes: 'half' }),
      sit({ headDy: 0, mouth: 'tongue', eyes: 'happy', fx: 'sparkles' }),
    ],
  },
  {
    name: 'playing',
    fps: 8,
    loop: false,
    frames: [
      sit({ pawUp: true, eyes: 'wide', fx: 'music' }),
      sit({ pawUp: false, eyes: 'wide', headDx: 1, fx: 'music' }),
      sit({ pawUp: true, eyes: 'happy', mouth: 'smile', fx: 'music' }),
      sit({ pawUp: false, eyes: 'happy', mouth: 'smile', headDx: -1, fx: 'music' }),
    ],
  },
];
