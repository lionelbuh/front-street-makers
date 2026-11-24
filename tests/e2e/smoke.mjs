// End-to-end smoke test (demo mode): every page loads without errors, the
// street mounts, the directory filters, and an application goes all the way
// from the form through the admin dashboard to the public directory.
// Run: npm run test:e2e   (screenshots go to test-results/ when SHOTS=1)
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { serve } from '../../tools/serve.mjs';

// Playwright comes from devDependencies (CI) or a global install (local machines).
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = createRequire(import.meta.url)('playwright')); }

const server = await serve(0);
const base = `http://localhost:${server.address().port}`;
const shots = process.env.SHOTS === '1';
if (shots) mkdirSync('test-results', { recursive: true });
const browser = await chromium.launch();
let failures = 0;

async function check(name, fn) {
  try { await fn(); console.log(`ok - ${name}`); }
  catch (err) { failures++; console.log(`not ok - ${name}\n  ${err.message.split('\n').join('\n  ')}`); }
}
async function newPage(viewport = { width: 1280, height: 860 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) page.errors.push(m.text()); });
  return page;
}
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

const PAGES = ['', 'marketplace/', 'community/', 'startup-corner/', 'get-listed/', 'privacy/', 'terms/', 'admin/', 'business/?b=demo-sourdough'];
for (const path of PAGES) {
  await check(`page loads cleanly: /${path}`, async () => {
    const page = await newPage();
    await page.goto(`${base}/${path}`);
    await page.waitForTimeout(500);
    assert.deepEqual(page.errors, []);
    assert.ok(await page.locator('h1').first().isVisible() || path === 'admin/');
    if (shots) await page.screenshot({ path: `test-results/${path.replace(/[/?=]/g, '_') || 'home'}.png`, fullPage: true });
    await page.context().close();
  });
}

await check('phones: no sideways page scroll on any page', async () => {
  const page = await newPage({ width: 390, height: 844 });
  for (const path of PAGES) {
    await page.goto(`${base}/${path}`);
    await page.waitForTimeout(300);
    assert.equal(await noOverflow(page), 0, `/${path} scrolls sideways`);
  }
  await page.context().close();
});

await check('home: street shows today\'s stalls and open stalls', async () => {
  const page = await newPage();
  await page.goto(`${base}/`);
  await page.waitForSelector('.stall');
  assert.equal(await page.locator('.stall').count(), 12);
  const open = await page.locator('.stall--open').count();
  assert.ok(open >= 2, 'at least two open stalls');
  assert.equal(await page.locator('#stall-list .biz-card').count(), 12 - open);
  await page.locator('.stall:not(.stall--open)').first().click({ force: true });
  await page.waitForSelector('#profile[open]');
  assert.ok((await page.textContent('#profile-title')).length > 2);
  await page.context().close();
});

await check('marketplace: search and filters narrow the directory', async () => {
  const page = await newPage();
  await page.goto(`${base}/marketplace/`);
  await page.waitForSelector('#directory-results .biz-card');
  const all = await page.locator('#directory-results .biz-card').count();
  assert.equal(all, 10);
  await page.fill('#f-q', 'candle');
  assert.equal(await page.locator('#directory-results .biz-card').count(), 1);
  await page.fill('#f-q', '');
  await page.check('input[name="cat"][value="micro"]', { force: true });
  const micro = await page.locator('#directory-results .biz-card').count();
  assert.ok(micro > 0 && micro < all);
  assert.match(page.url(), /cat=micro/);
  await page.context().close();
});

await check('apply → review → approve → listed', async () => {
  const page = await newPage();
  await page.goto(`${base}/get-listed/`);
  await page.check('input[name="category"][value="home"]', { force: true });
  await page.fill('#name', 'Sample Test Pies');
  await page.selectOption('#kind', 'baked');
  await page.fill('#summary', 'Seasonal fruit pies baked in a home kitchen for weekend pickup.');
  await page.selectOption('#city', 'Murrieta');
  await page.fill('#area', 'Murrieta · porch pickup');
  await page.fill('#instagram', '@testpies');
  await page.setInputFiles('#photos', 'src/assets/img/sponsors/meringuesuisse-balloon.jpg');
  await page.waitForSelector('#photo-previews li');
  await page.check('input[name="photo_rights"]');
  await page.check('input[name="license_status"][value="unsure"]', { force: true });
  await page.waitForSelector('#license-guidance:not([hidden])');
  await page.check('input[name="wants_help"][value="yes"]', { force: true });
  await page.fill('#owner_name', 'Pat Tester');
  await page.fill('#contact_email', 'pat@example.com');
  await page.check('input[name="independent_ok"]');
  await page.check('input[name="agree"]');
  await page.click('#apply-submit');
  await page.waitForSelector('#apply-done:not([hidden])');
  assert.match(await page.textContent('#apply-done'), /licensing is not settled/);
  if (shots) await page.screenshot({ path: 'test-results/apply-done.png', fullPage: true });

  await page.goto(`${base}/admin/`);
  await page.fill('#login-password', 'demo');
  await page.click('#login-form button[type="submit"]');
  await page.waitForSelector('#app-list tr[data-id]');
  await page.click('#status-filters button[data-status="assistance"]');
  await page.click('text=Sample Test Pies');
  await page.waitForSelector('#detail-form');
  assert.match(await page.textContent('#detail'), /pat@example.com/);
  assert.match(await page.textContent('#detail'), /not sure/i);
  await page.selectOption('#d-status', 'approved');
  await page.fill('#d-notes', 'Talked through Riverside County CFO registration.');
  await page.click('#detail-form button[type="submit"]');
  await page.waitForFunction(() => /published/.test(document.querySelector('#admin-toast').textContent));
  if (shots) await page.screenshot({ path: 'test-results/admin.png', fullPage: true });

  await page.click('.admin-tabs button[data-tab="rotation"]');
  await page.waitForSelector('#rotation-preview tr');
  assert.match(await page.textContent('#rotation-preview'), /Sample Test Pies/, 'new business gets a welcome spot');
  if (shots) await page.screenshot({ path: 'test-results/admin-rotation.png', fullPage: true });

  await page.goto(`${base}/marketplace/?q=pies`);
  await page.waitForSelector('#directory-results .biz-card');
  assert.match(await page.textContent('#directory-results'), /Sample Test Pies/);
  await page.goto(`${base}/business/?b=sample-test-pies`);
  await page.waitForSelector('#profile-title');
  assert.equal(await page.textContent('#profile-title'), 'Sample Test Pies');
  assert.ok(!(await page.textContent('#business')).includes('pat@example.com'), 'private email never shown');
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

await check('community: a story goes to review, then can be published', async () => {
  const page = await newPage();
  await page.goto(`${base}/community/`);
  await page.fill('#s-author', 'Robin');
  await page.fill('#s-email', 'robin@example.com');
  await page.fill('#s-title', 'From farmers market to regulars');
  await page.fill('#s-body', 'I started with a folding table and twelve jars of jam. '.repeat(3));
  await page.waitForTimeout(3100);
  await page.click('#story-form button[type="submit"]');
  await page.waitForFunction(() => /Thank you/.test(document.querySelector('#story-status').textContent));
  await page.context().close();
});

await browser.close();
server.close();
console.log(failures ? `\n${failures} failed` : '\nall end-to-end checks passed');
process.exit(failures ? 1 : 0);
