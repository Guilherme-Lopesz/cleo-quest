// Servidor estático mínimo para E2E: serve `dist/` sob o mesmo `base` do GitHub Pages.
// Sem fallback de SPA, de propósito: o Pages também não tem (SAD §17.2).
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.env.PORT ?? 4321);
const BASE = (process.env.BASE_PATH ?? '/cleo-quest/').replace(/\/?$/, '/');
const ROOT = process.env.DIST_DIR ?? 'dist';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.webmanifest': 'application/manifest+json',
};

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (!url.pathname.startsWith(BASE)) {
    res.writeHead(404).end('fora do base');
    return;
  }
  let rel = decodeURIComponent(url.pathname.slice(BASE.length));
  let file = normalize(join(ROOT, rel));
  if (!file.startsWith(normalize(ROOT))) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
  if (!existsSync(file)) {
    const notFound = join(ROOT, '404.html');
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    if (existsSync(notFound)) createReadStream(notFound).pipe(res);
    else res.end('404');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.info(`serve-dist: http://localhost:${PORT}${BASE}`));
