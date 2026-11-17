/**
 * Gera ilustrações de desenvolvimento para a galeria (marcadas `placeholder: true`)
 * usando a própria pixel art da Cleo sobre cenários simples. Passam pelo mesmo
 * pipeline das fotos reais. Substituir por fotos reais via `pnpm photos:import`.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { PixelCanvas } from '../sprites/canvas';
import { drawCleo, type Pose } from '../sprites/cleo';
import { importPhotos, type PhotoMeta } from './pipeline';

const root = process.cwd();
const tmp = join(root, '.astro', 'placeholders-src');
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

interface Scene {
  id: string;
  phase: string;
  date: string;
  alt: string;
  caption: string;
  tags: string[];
  sky: [string, string];
  ground: string;
  pose: Pose;
  scale: number;
  featured?: boolean;
  landscape?: boolean;
}

const scenes: Scene[] = [
  {
    id: 'chegada-01',
    phase: 'chegada',
    date: '2024-01-05',
    alt: 'Cleo filhote sentada numa manta clara, olhando para cima',
    caption: 'Primeiro dia. Já avaliando o território.',
    tags: ['chegada', 'manta'],
    sky: ['#f7e9dc', '#f3d9c9'],
    ground: '#e8ddc9',
    pose: { stance: 'sit', eyes: 'wide' },
    scale: 7,
    featured: true,
  },
  {
    id: 'chegada-02',
    phase: 'chegada',
    date: '2024-01-08',
    alt: 'Cleo filhote dormindo enrolada',
    caption: 'Carregando energia desde o início.',
    tags: ['chegada', 'soneca'],
    sky: ['#e9eef7', '#d6def0'],
    ground: '#cfd8e8',
    pose: { stance: 'lie', eyes: 'closed', fx: 'zzz' },
    scale: 7,
    landscape: true,
  },
  {
    id: 'chegada-03',
    phase: 'chegada',
    date: '2024-01-12',
    alt: 'Cleo filhote na caminha nova',
    caption: 'A caminha. Usada três vezes.',
    tags: ['chegada', 'caminha'],
    sky: ['#fbefe6', '#f5dccc'],
    ground: '#d9b8a8',
    pose: { stance: 'sit', eyes: 'half', tail: 'curl' },
    scale: 6,
  },
  {
    id: 'filhote-01',
    phase: 'filhote',
    date: '2024-03-02',
    alt: 'Cleo filhote brincando com um novelo',
    caption: 'O novelo nunca teve chance.',
    tags: ['filhote', 'brincadeira', 'novelo'],
    sky: ['#e8f4f1', '#cfe8e3'],
    ground: '#b9ddd6',
    pose: { stance: 'sit', pawUp: true, eyes: 'wide', fx: 'music' },
    scale: 7,
    featured: true,
  },
  {
    id: 'filhote-02',
    phase: 'filhote',
    date: '2024-03-20',
    alt: 'Cleo filhote escalando a cortina',
    caption: 'Cortinas são escadas. Fato.',
    tags: ['filhote', 'bagunça'],
    sky: ['#fdf3e0', '#f7e2b8'],
    ground: '#eac98a',
    pose: { stance: 'stand', eyes: 'wide', mouth: 'open', tail: 'up' },
    scale: 6,
    landscape: true,
  },
  {
    id: 'filhote-03',
    phase: 'filhote',
    date: '2024-04-04',
    alt: 'Cleo filhote com o ratinho de feltro',
    caption: 'O ratinho, antes de perder a cauda.',
    tags: ['filhote', 'brinquedo'],
    sky: ['#f3ecf7', '#e4d6f0'],
    ground: '#cdbbe0',
    pose: { stance: 'lie', eyes: 'happy', mouth: 'smile', fx: 'hearts' },
    scale: 7,
  },
  {
    id: 'filhote-04',
    phase: 'filhote',
    date: '2024-05-15',
    alt: 'Cleo filhote olhando pela janela',
    caption: 'Primeiro contato com o passarinho.',
    tags: ['filhote', 'janela'],
    sky: ['#dcefff', '#bfe0ff'],
    ground: '#9ec7ea',
    pose: { stance: 'sit', eyes: 'wide', headDx: 1 },
    scale: 6,
    landscape: true,
  },
  {
    id: 'jovem-01',
    phase: 'jovem',
    date: '2024-09-10',
    alt: 'Cleo jovem usando o colete teal pela primeira vez',
    caption: 'Fingi que odiei. Não odiei.',
    tags: ['jovem', 'colete', 'moda'],
    sky: ['#e6f3f1', '#c9e7e2'],
    ground: '#a5d3cb',
    pose: { stance: 'stand', eyes: 'half', mouth: 'frown', tail: 'down' },
    scale: 7,
    featured: true,
  },
  {
    id: 'jovem-02',
    phase: 'jovem',
    date: '2024-10-02',
    alt: 'Cleo jovem na janela observando um passarinho',
    caption: 'Ele volta às 7h. Eu também.',
    tags: ['jovem', 'janela'],
    sky: ['#ffe9d6', '#ffd1b0'],
    ground: '#f0b78f',
    pose: { stance: 'sit', eyes: 'wide', tail: 'swishA' },
    scale: 6,
    landscape: true,
  },
  {
    id: 'jovem-03',
    phase: 'jovem',
    date: '2024-12-24',
    alt: 'Cleo jovem com um laço de festa',
    caption: 'Festa de fim de ano. Eu era a atração.',
    tags: ['jovem', 'festa', 'moda'],
    sky: ['#f7e6ea', '#f0cfd7'],
    ground: '#e2aeb9',
    pose: { stance: 'sit', eyes: 'happy', mouth: 'smile', fx: 'sparkles' },
    scale: 7,
  },
  {
    id: 'adulta-01',
    phase: 'adulta',
    date: '2025-06-01',
    alt: 'Cleo adulta deitada no sofá',
    caption: 'Rainha do sofá, em pleno exercício do cargo.',
    tags: ['adulta', 'sofá', 'soneca'],
    sky: ['#f6efe6', '#eadfce'],
    ground: '#c9b296',
    pose: { stance: 'lie', eyes: 'half' },
    scale: 7,
    landscape: true,
    featured: true,
  },
  {
    id: 'adulta-02',
    phase: 'adulta',
    date: '2025-09-14',
    alt: 'Cleo adulta dentro da caixa favorita',
    caption: 'Essa caixa agora é minha propriedade.',
    tags: ['adulta', 'caixa'],
    sky: ['#f2ebe0', '#e5d9c7'],
    ground: '#c8a77f',
    pose: { stance: 'sit', eyes: 'open', tail: 'curl' },
    scale: 7,
  },
  {
    id: 'adulta-03',
    phase: 'adulta',
    date: '2026-02-20',
    alt: 'Cleo adulta fiscalizando o jantar',
    caption: 'Inspeção de qualidade, todas as noites.',
    tags: ['adulta', 'comida'],
    sky: ['#fff3dc', '#ffe3b3'],
    ground: '#f2c57a',
    pose: { stance: 'sit', headDy: 2, mouth: 'open', eyes: 'half' },
    scale: 6,
    landscape: true,
  },
  {
    id: 'adulta-04',
    phase: 'adulta',
    date: '2026-08-08',
    alt: 'Cleo adulta dormindo ao sol',
    caption: 'Relatório de soneca: aprovado.',
    tags: ['adulta', 'soneca', 'sol'],
    sky: ['#fff6d9', '#ffe9a8'],
    ground: '#f5d57a',
    pose: { stance: 'lie', eyes: 'closed', fx: 'zzz', earsBack: true },
    scale: 7,
  },
];

const meta: Record<string, PhotoMeta> = {};
for (const s of scenes) {
  const W = s.landscape ? 1200 : 900;
  const H = s.landscape ? 800 : 1000;
  const frame = new PixelCanvas(32, 32);
  frame.blit(drawCleo(s.pose, 'base'));
  frame.blit(drawCleo(s.pose, 'vest'));
  frame.blit(drawCleo(s.pose, 'fx'));
  const spritePng = frame.scaled(s.scale).toPNG();
  const sw = 32 * s.scale;
  const groundY = Math.round(H * 0.68);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.sky[0]}"/><stop offset="1" stop-color="${s.sky[1]}"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <rect y="${groundY}" width="${W}" height="${H - groundY}" fill="${s.ground}"/>
    <ellipse cx="${W / 2}" cy="${groundY + 10}" rx="${sw * 0.45}" ry="${sw * 0.08}" fill="rgba(0,0,0,0.12)"/>
    <text x="${W - 24}" y="${H - 24}" text-anchor="end" font-family="monospace" font-size="22" fill="rgba(0,0,0,0.35)">ilustração provisória</text>
  </svg>`;
  const png = await sharp(Buffer.from(svg))
    .composite([
      {
        input: spritePng,
        left: Math.round(W / 2 - sw / 2),
        top: groundY + 12 - sw + Math.round(4 * s.scale),
      },
    ])
    .png()
    .toBuffer();
  writeFileSync(join(tmp, `${s.id}.png`), png);
  meta[s.id] = {
    alt: s.alt,
    caption: s.caption,
    date: s.date,
    phase: s.phase,
    tags: s.tags,
    ...(s.featured ? { featured: true } : {}),
  };
}

const photos = await importPhotos({
  sourceDir: tmp,
  outDir: join(root, 'public', 'images', 'gallery'),
  manifestPath: join(root, 'src', 'content', 'gallery', 'photos.json'),
  publicPrefix: '/images/gallery',
  placeholder: true,
  meta,
});
rmSync(tmp, { recursive: true, force: true });
console.info(`placeholders: ${photos.length} ilustrações no manifesto`);
