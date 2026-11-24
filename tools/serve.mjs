// Tiny static server for dist/ (local preview and end-to-end tests).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain' };
export function serve(port = Number(process.env.PORT) || 4173) {
  const server = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    p = normalize(p).replace(/^(\.\.[/\\])+/, '');
    let file = join(dist, p);
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      res.end(await readFile(join(dist, '404.html')).catch(() => 'Not found'));
    }
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = await serve();
  console.log(`Serving dist/ at http://localhost:${s.address().port}`);
}
