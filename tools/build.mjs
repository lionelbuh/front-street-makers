// Builds the static site into dist/ (served by GitHub Pages).
// Each src/pages/*.html starts with a JSON comment describing the page:
//   <!--{"path":"marketplace/","title":"...","description":"...","nav":"marketplace","street":true,"module":"market-page.js"}-->
// and can include <!--#street--> and <!--#dialog--> where those blocks go.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => join(root, 'src', p);
const out = join(root, 'dist');
const part = (name) => readFileSync(src(`partials/${name}.html`), 'utf8');

const MARKET_SCRIPTS = ['market/sponsors.js', 'market/street-scene.js', 'market/stall.js', 'market/street.js', 'market/crowd.js'];
const NAV = ['marketplace', 'community', 'startup', 'getlisted'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(src('assets'), join(out, 'assets'), { recursive: true });
for (const f of readdirSync(src('static'))) cpSync(src(`static/${f}`), join(out, f), { recursive: true });

// Tests run against the in-browser demo, never the live API: FORCE_DEMO=1 npm run build
if (process.env.FORCE_DEMO) {
  const cfg = join(out, 'assets/js/app/config.js');
  writeFileSync(cfg, readFileSync(cfg, 'utf8').replace(/API_BASE: '[^']*'/, "API_BASE: ''"));
}

const urls = [];
for (const file of readdirSync(src('pages')).filter((f) => f.endsWith('.html'))) {
  const raw = readFileSync(src(`pages/${file}`), 'utf8');
  const m = raw.match(/^<!--(\{[\s\S]*?\})-->\s*/);
  if (!m) throw new Error(`${file}: missing page header`);
  const meta = JSON.parse(m[1]);
  let body = raw.slice(m[0].length);
  const depth = meta.path ? meta.path.split('/').filter(Boolean).length : 0;
  const rootPath = depth ? '../'.repeat(depth) : './';
  body = body.replace('<!--#street-->', part('street')).replace('<!--#dialog-->', part('dialog'));

  let header = part('header');
  for (const n of NAV) header = header.replaceAll(`{{current:${n}}}`, meta.nav === n ? ' aria-current="page"' : '');
  const scripts = [
    ...(meta.street ? MARKET_SCRIPTS : meta.stall ? ['market/street-scene.js', 'market/stall.js'] : []).map((s) => `<script src="{{root}}assets/js/${s}"></script>`),
    meta.module ? `<script type="module" src="{{root}}assets/js/app/${meta.module}"></script>` : ''
  ].join('\n');
  const title = meta.home ? meta.title : `${meta.title} · Front Street Makers`;
  let html = `<!doctype html>
<html lang="en" data-root="{{root}}">
<head>
${part('head')}</head>
<body data-page="${meta.page || ''}">
${header}
<main id="main"${meta.mainClass ? ` class="${meta.mainClass}"` : ''}>
${body}
</main>
${meta.footer === false ? '' : part('footer')}
${scripts}
</body>
</html>
`;
  html = html
    .replaceAll('{{title}}', title)
    .replaceAll('{{description}}', meta.description || '')
    .replaceAll('{{robots}}', meta.noindex ? '<meta name="robots" content="noindex, nofollow">' : '')
    .replaceAll('{{path}}', meta.path || '')
    .replaceAll('{{root}}', rootPath === './' ? '' : rootPath);
  const dest = meta.path === '404' ? join(out, '404.html') : join(out, meta.path || '', 'index.html');
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, html);
  if (!meta.noindex && meta.path !== '404') urls.push(`https://frontstreetmakers.com/${meta.path || ''}`);
}
writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.sort().map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`);
if (!existsSync(join(out, 'index.html'))) throw new Error('home page missing');
console.log(`built ${urls.length} public pages into dist/`);
