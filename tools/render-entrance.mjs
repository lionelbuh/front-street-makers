// Renders the entrance view's unchanging background (sky, hills, ground,
// facades, festoons) to src/assets/img/entrance/lane-{day,evening}.jpg.
// Run after changing the architecture or the lane's geometry in entrance.js:
//   node tools/render-entrance.mjs
// Needs Playwright with Chromium (a dev tool, not part of the site build).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { serve } from './serve.mjs';

let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire(import.meta.url)('playwright')); }

execFileSync(process.execPath, ['tools/build.mjs'], { env: { ...process.env, FORCE_DEMO: '1' }, stdio: 'inherit' });
const server = await serve(0);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2700, height: 1200 } });
await page.addInitScript(() => { window.__BAKE_ENTRANCE__ = true; });
await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'networkidle' });
await page.addStyleTag({ content: '#entrance{width:2600px!important;height:1000px!important;right:auto!important} #enter{display:none!important}' });
await page.evaluate(() => window.dispatchEvent(new Event('resize')));
await page.waitForTimeout(800);
mkdirSync('src/assets/img/entrance', { recursive: true });
for (const scene of ['day', 'evening']) {
  await page.evaluate((sc) => { document.querySelector('.market').dataset.scene = sc; }, scene);
  await page.waitForTimeout(700);
  await page.locator('#entrance').screenshot({ path: `src/assets/img/entrance/lane-${scene}.jpg`, type: 'jpeg', quality: 76 });
  console.log(`wrote src/assets/img/entrance/lane-${scene}.jpg`);
}
await browser.close();
server.close();
