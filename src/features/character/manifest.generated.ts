// Gerado por scripts/sprites/generate.ts — não editar à mão.
export const CLEO_SPRITES = {
  frameWidth: 32,
  frameHeight: 32,
  columns: 4,
  layers: ['base', 'vest', 'crown', 'hat', 'bow', 'tie', 'fx'],
  animations: {
    idle: {
      row: 0,
      frames: 4,
      fps: 2,
      loop: true,
    },
    blink: {
      row: 1,
      frames: 3,
      fps: 8,
      loop: false,
    },
    walk: {
      row: 2,
      frames: 4,
      fps: 8,
      loop: true,
    },
    sitting: {
      row: 3,
      frames: 4,
      fps: 2,
      loop: true,
    },
    sleeping: {
      row: 4,
      frames: 2,
      fps: 1,
      loop: true,
    },
    happy: {
      row: 5,
      frames: 4,
      fps: 6,
      loop: false,
    },
    angry: {
      row: 6,
      frames: 3,
      fps: 6,
      loop: false,
    },
    scratch: {
      row: 7,
      frames: 4,
      fps: 8,
      loop: false,
    },
    surprised: {
      row: 8,
      frames: 2,
      fps: 6,
      loop: false,
    },
    sad: {
      row: 9,
      frames: 2,
      fps: 2,
      loop: false,
    },
    eating: {
      row: 10,
      frames: 4,
      fps: 6,
      loop: false,
    },
    playing: {
      row: 11,
      frames: 4,
      fps: 8,
      loop: false,
    },
  },
} as const;
