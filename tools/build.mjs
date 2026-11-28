// Builds the static site into dist/ (served by GitHub Pages).
//
// Each src/pages/*.html starts with a JSON comment describing the page:
//   <!--{"path":"marketplace/","title":"...","description":"...","nav":"marketplace","street":true,"module":"market-page.js"}-->
// and can include <!--#street--> and <!--#dialog--> where those blocks go.
//
// For search engines, the build also fetches the approved businesses from the
// live API and writes one real HTML page per business (business/<slug>/), a
// pre-rendered directory, structured data and a sitemap. The site is rebuilt
// every night (.github/workflows/deploy.yml) so new businesses get their page.
//
//   FORCE_DEMO=1  build against the demo businesses (tests); no live API calls
import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { SITE, esc, businessPath, businessTitle, businessDescription, staticProfile, businessJsonLd, staticCard, directoryJsonLd } from './render.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => join(root, 'src', p);
const out = join(root, 'dist');
const part = (name) => readFileSync(src(`partials/${name}.html`), 'utf8');
const today = new Date().toISOString().slice(0, 10);
const DEFAULT_OG = `${SITE}/og-image.jpg`;

const MARKET_SCRIPTS = ['market/sponsors.js', 'market/street-scene.js', 'market/stall.js', 'market/street.js', 'market/crowd.js', 'market/entrance.js'];
const NAV = ['marketplace', 'community', 'startup', 'getlisted'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(src('assets'), join(out, 'assets'), { recursive: true });
for (const f of readdirSync(src('static'))) cpSync(src(`static/${f}`), join(out, f), { recursive: true });

const demo = Boolean(process.env.FORCE_DEMO);

/* ---------- cache busting ----------
   Every script and the stylesheet are linked with ?v=<hash of their content>,
   and app modules import each other the same way, so a phone never keeps an
   old copy after an update (GitHub Pages lets browsers cache files 10 minutes). */
const ver = (rel) => createHash('sha256').update(readFileSync(join(out, 'assets', rel))).digest('hex').slice(0, 10);
// app modules share one version (any change to any module changes it), so the
// imports between them never point at a stale copy
const APP_DIR = join(out, 'assets/js/app');
const appFiles = () => readdirSync(APP_DIR).filter((n) => n.endsWith('.js')).sort();
function versionModules() {
  const h = createHash('sha256');
  for (const f of appFiles()) h.update(f).update(readFileSync(join(APP_DIR, f)));
  const v = h.digest('hex').slice(0, 10);
  for (const f of appFiles()) {
    const file = join(APP_DIR, f);
    const src = readFileSync(file, 'utf8');
    const next = src.replace(/(from\s+|import\s*\(\s*)(['"])\.\/([\w-]+\.js)\2/g, (m, pre, q, name) => `${pre}${q}./${name}?v=${v}${q}`);
    if (next !== src) writeFileSync(file, next);
  }
  return v;
}
if (demo) {
  const cfg = join(out, 'assets/js/app/config.js');
  writeFileSync(cfg, readFileSync(cfg, 'utf8').replace(/API_BASE: '[^']*'/, "API_BASE: ''"));
}
const APP_V = versionModules(); // after the demo config tweak, before any page is written

/* ---------- approved businesses ---------- */
async function loadBusinesses() {
  if (demo) {
    const { DEMO_BUSINESSES } = await import('../src/assets/js/app/demo-businesses.js');
    return DEMO_BUSINESSES;
  }
  const base = (readFileSync(src('assets/js/app/config.js'), 'utf8').match(/API_BASE: '([^']*)'/) || [])[1];
  if (!base) return [];
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/market`, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()).businesses || [];
  } catch (err) {
    // In CI, stop: GitHub Pages keeps the previous site rather than publishing one without businesses.
    if (process.env.CI) throw new Error(`Could not load businesses from ${base}: ${err.message}`);
    console.warn(`warning: could not load businesses (${err.message}); building without business pages`);
    return [];
  }
}
const businesses = (await loadBusinesses()).filter((b) => b && b.slug);

/* ---------- page assembly ---------- */
function assemble(meta, body, { extraHead = '', canonicalPath, ogImage = DEFAULT_OG, ogType = 'website', rootPath }) {
  let header = part('header');
  for (const n of NAV) header = header.replaceAll(`{{current:${n}}}`, meta.nav === n ? ' aria-current="page"' : '');
  const scripts = [
    ...(meta.street ? MARKET_SCRIPTS : meta.stall ? ['market/street-scene.js', 'market/stall.js'] : []).map((s) => `<script src="{{root}}assets/js/${s}?v=${ver('js/' + s)}"></script>`),
    meta.module ? `<script type="module" src="{{root}}assets/js/app/${meta.module}?v=${APP_V}"></script>` : '',
    (meta.inlineScript || '').replace(/(\/assets\/js\/app\/[\w-]+\.js)/g, `$1?v=${APP_V}`)
  ].join('\n');
  const title = meta.home || meta.fullTitle ? meta.title : `${meta.title} · Front Street Makers`;
  const html = `<!doctype html>
<html lang="en" data-root="{{root}}">
<head>
${part('head')}${extraHead}
</head>
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
  return html
    .replaceAll('{{title}}', esc(title))
    .replaceAll('{{description}}', esc(meta.description || ''))
    .replaceAll('{{robots}}', meta.noindex ? '<meta name="robots" content="noindex, nofollow">' : '')
    .replaceAll('{{canonical}}', `${SITE}/${canonicalPath}`)
    .replaceAll('{{og_image}}', esc(ogImage))
    .replaceAll('{{og_type}}', ogType)
    .replaceAll('{{css_v}}', ver('css/site.css'))
    .replaceAll('{{root}}', rootPath);
}
const rootFor = (path) => {
  const depth = path ? path.split('/').filter(Boolean).length : 0;
  return depth ? '../'.repeat(depth) : '';
};
function write(path, html) {
  const dest = path === '404' ? join(out, '404.html') : join(out, path, 'index.html');
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, html);
}

const urls = [];
for (const file of readdirSync(src('pages')).filter((f) => f.endsWith('.html'))) {
  const raw = readFileSync(src(`pages/${file}`), 'utf8');
  const m = raw.match(/^<!--(\{[\s\S]*?\})-->\s*/);
  if (!m) throw new Error(`${file}: missing page header`);
  const meta = JSON.parse(m[1]);
  // 404 can be served at any depth, so it uses absolute links
  const rootPath = meta.path === '404' ? '/' : rootFor(meta.path);
  let body = raw.slice(m[0].length).replace('<!--#street-->', part('street')).replace('<!--#dialog-->', part('dialog'));
  let extraHead = '';
  if (meta.page === 'marketplace' && businesses.length) {
    // pre-rendered directory: crawlers see every business; the script replaces it with the interactive version
    body = body.replace('<div id="directory-results" class="biz-grid"></div>',
      `<div id="directory-results" class="biz-grid">${businesses.map((b) => staticCard(b, rootPath)).join('')}</div>`);
    if (!demo) extraHead = directoryJsonLd(businesses);
  }
  write(meta.path || '', assemble(meta, body, { extraHead, canonicalPath: meta.path === '404' ? '' : meta.path || '', rootPath }));
  if (!meta.noindex && meta.path !== '404' && meta.page !== 'business') urls.push({ loc: `${SITE}/${meta.path || ''}` });
}

/* ---------- one real page per business ---------- */
for (const b of businesses) {
  const path = businessPath(b);
  const rootPath = rootFor(path);
  const meta = {
    title: businessTitle(b), fullTitle: true, description: businessDescription(b), nav: 'marketplace', page: 'business',
    stall: true, module: 'business-page.js', noindex: Boolean(b.isDemo)
  };
  const body = `<article id="business" class="wrap business-page" data-slug="${esc(b.slug)}">${staticProfile(b, rootPath)}</article>`;
  write(path, assemble(meta, body, {
    extraHead: b.isDemo ? '' : businessJsonLd(b),
    canonicalPath: path,
    ogImage: b.photos && b.photos[0] ? b.photos[0].url : DEFAULT_OG,
    ogType: 'profile',
    rootPath
  }));
  if (!b.isDemo) urls.push({ loc: `${SITE}/${path}`, lastmod: String(b.publishedAt || today).slice(0, 10) });
}

writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.sort((a, b) => (a.loc < b.loc ? -1 : 1)).map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`);
if (!existsSync(join(out, 'index.html'))) throw new Error('home page missing');
console.log(`built ${urls.length} indexable pages (${businesses.length} business pages) into dist/`);
