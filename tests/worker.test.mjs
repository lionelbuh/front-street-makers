import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { cleanUrl, socialUrl, text } from '../worker/src/index.js';
import { fakeEnv } from './helpers/fake-env.mjs';

const ORIGIN = 'https://temeculahomegrown.com';
const API = 'https://api.temeculahomegrown.com';

function call(env, method, path, { body, token, form, headers = {} } = {}) {
  const h = new Headers({ origin: ORIGIN, ...headers });
  if (token) h.set('authorization', `Bearer ${token}`);
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { payload = JSON.stringify(body); h.set('content-type', 'application/json'); }
  return worker.fetch(new Request(API + path, { method, headers: h, body: payload }), env);
}
async function jsonOf(res) { return res.json(); }

function applicationForm(over = {}) {
  const f = new FormData();
  const fields = {
    category: 'home', name: 'Valley Sourdough', kind: 'baked', type_label: 'Home bakery · Cottage Food',
    summary: 'Naturally leavened loaves baked in a home kitchen.', description: 'Weekend bakes.',
    city: 'Temecula', area: 'Temecula · porch pickup', website: 'valleysourdough.example.com', instagram: '@valleysourdough',
    first_name: 'Alexandra', public_email: 'hello@valleysourdough.example',
    license_status: 'ready', wants_help: 'no', independent_ok: 'on', agree: 'on', started_at: String(Date.now() - 60000), ...over
  };
  for (const [k, v] of Object.entries(fields)) if (v !== null) f.append(k, v);
  return f;
}
async function login(env) {
  const res = await call(env, 'POST', '/api/admin/login', { body: { password: env.ADMIN_PASSWORD } });
  assert.equal(res.status, 200);
  return (await jsonOf(res)).token;
}

test('input helpers normalize links and strip control characters', () => {
  assert.equal(cleanUrl('example.com/shop'), 'https://example.com/shop');
  assert.equal(cleanUrl('javascript:alert(1)'), '');
  assert.equal(socialUrl('@maker', 'instagram.com'), 'https://www.instagram.com/maker');
  assert.equal(socialUrl('https://evil.com/x', 'instagram.com'), '');
  assert.equal(socialUrl('maker', 'tiktok.com'), 'https://www.tiktok.com/@maker');
  assert.equal(text('a\u0000b  ', 10), 'ab');
});

test('application: valid submission is stored privately and not published', async () => {
  const env = fakeEnv();
  const photo = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], 'loaf.jpg', { type: 'image/jpeg' });
  const form = applicationForm({ photo_rights: 'on' });
  form.append('photos', photo);
  const res = await call(env, 'POST', '/api/applications', { form });
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  const out = await jsonOf(res);
  assert.equal(out.status, 'new');
  assert.equal(env.PHOTOS.store.size, 1);

  const market = await jsonOf(await call(env, 'GET', '/api/market'));
  assert.equal(market.businesses.length, 0, 'not public before approval');
});

test('application: licensing answers set the initial status', async () => {
  const env = fakeEnv();
  const a = await jsonOf(await call(env, 'POST', '/api/applications', { form: applicationForm({ license_status: 'unsure', wants_help: 'yes', name: 'Valley Sourdough A' }) }));
  assert.equal(a.status, 'assistance');
  assert.equal(a.needsGuidance, true);
  const b = await jsonOf(await call(env, 'POST', '/api/applications', { form: applicationForm({ license_status: 'not_started', wants_help: 'no', name: 'Valley Sourdough B' }) }));
  assert.equal(b.status, 'clarifying');
});

test('application: at least one public contact is required', async () => {
  const env = fakeEnv();
  const res = await call(env, 'POST', '/api/applications', { form: applicationForm({ public_email: null, website: null, instagram: null }) });
  assert.equal(res.status, 422);
  assert.ok((await jsonOf(res)).fields.public_email);
});

test('application: missing answers return field errors', async () => {
  const env = fakeEnv();
  const res = await call(env, 'POST', '/api/applications', { form: applicationForm({ name: '', independent_ok: null, license_status: 'maybe' }) });
  assert.equal(res.status, 422);
  const out = await jsonOf(res);
  assert.ok(out.fields.name && out.fields.independent_ok && out.fields.license_status);
});

test('application: honeypot and too-fast submissions are rejected', async () => {
  const env = fakeEnv();
  assert.equal((await call(env, 'POST', '/api/applications', { form: applicationForm({ company_website: 'spam' }) })).status, 400);
  assert.equal((await call(env, 'POST', '/api/applications', { form: applicationForm({ started_at: String(Date.now()) }) })).status, 400);
});

test('application: non-image uploads are refused', async () => {
  const env = fakeEnv();
  const form = applicationForm({ photo_rights: 'on' });
  form.append('photos', new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }));
  assert.equal((await call(env, 'POST', '/api/applications', { form })).status, 400);
});

test('admin: wrong password refused, admin routes need a session', async () => {
  const env = fakeEnv();
  assert.equal((await call(env, 'POST', '/api/admin/login', { body: { password: 'nope' } })).status, 401);
  assert.equal((await call(env, 'GET', '/api/admin/businesses')).status, 401);
  assert.equal((await call(env, 'GET', '/api/admin/businesses', { token: 'forged.token' })).status, 401);
});

test('admin approves → business appears publicly without private fields', async () => {
  const env = fakeEnv();
  const form = applicationForm({ photo_rights: 'on' });
  form.append('photos', new File([new Uint8Array([1, 2, 3])], 'p.jpg', { type: 'image/jpeg' }));
  await call(env, 'POST', '/api/applications', { form });
  const token = await login(env);

  const list = await jsonOf(await call(env, 'GET', '/api/admin/businesses', { token }));
  assert.equal(list.counts.new, 1);
  const id = list.businesses[0].id;
  const detail = await jsonOf(await call(env, 'GET', `/api/admin/businesses/${id}`, { token }));
  assert.equal(detail.business.first_name, 'Alexandra');
  for (const gone of ['owner_name', 'contact_email', 'contact_phone', 'zip']) assert.ok(!(gone in detail.business), `${gone} is not collected`);

  // photo of an unapproved business is private
  const photoPath = new URL(detail.photos[0].url).pathname;
  assert.equal((await call(env, 'GET', photoPath)).status, 401);

  const upd = await call(env, 'PATCH', `/api/admin/businesses/${id}`, { token, body: { status: 'approved', notes: 'Checked CFO registration.', stall: { roof: 'gable', colors: ['#112233', '#445566', '#778899'] } } });
  assert.equal(upd.status, 200);

  const market = await jsonOf(await call(env, 'GET', '/api/market?date=2026-11-24'));
  assert.equal(market.businesses.length, 1);
  const pub = market.businesses[0];
  assert.equal(pub.name, 'Valley Sourdough');
  assert.equal(pub.links.instagram, 'https://www.instagram.com/valleysourdough');
  assert.equal(pub.stall.roof, 'gable');
  assert.ok(pub.publishedAt);
  assert.deepEqual(market.featured, [pub.id]);
  const leaked = JSON.stringify(market);
  for (const secret of ['Alexandra', 'Checked CFO', 'license', 'wants_help']) {
    assert.ok(!leaked.includes(secret), `public payload must not include ${secret}`);
  }
  assert.equal((await call(env, 'GET', photoPath)).status, 200, 'photo becomes public once approved');

  const one = await call(env, 'GET', `/api/businesses/${pub.slug}`);
  assert.equal(one.status, 200);

  const detail2 = await jsonOf(await call(env, 'GET', `/api/admin/businesses/${id}`, { token }));
  assert.ok(detail2.history.some((h) => h.action === 'status' && h.detail.includes('approved')));
});

test('admin: declined or deleted businesses disappear from public endpoints', async () => {
  const env = fakeEnv();
  await call(env, 'POST', '/api/applications', { form: applicationForm() });
  const token = await login(env);
  const id = (await jsonOf(await call(env, 'GET', '/api/admin/businesses', { token }))).businesses[0].id;
  await call(env, 'PATCH', `/api/admin/businesses/${id}`, { token, body: { status: 'approved' } });
  await call(env, 'PATCH', `/api/admin/businesses/${id}`, { token, body: { status: 'declined' } });
  assert.equal((await jsonOf(await call(env, 'GET', '/api/market'))).businesses.length, 0);
  assert.equal((await call(env, 'DELETE', `/api/admin/businesses/${id}`, { token })).status, 200);
  assert.equal((await jsonOf(await call(env, 'GET', '/api/admin/businesses', { token }))).businesses.length, 0);
});

test('admin: rotation settings are saved and previewed', async () => {
  const env = fakeEnv();
  const token = await login(env);
  const put = await jsonOf(await call(env, 'PUT', '/api/admin/settings', { token, body: { count: 6, newDays: 7, newMax: 2, seed: 'x' } }));
  assert.equal(put.settings.count, 6);
  const prev = await jsonOf(await call(env, 'GET', '/api/admin/rotation?days=3', { token }));
  assert.equal(prev.days.length, 3);
});

test('community stories are moderated before they appear', async () => {
  const env = fakeEnv();
  const res = await call(env, 'POST', '/api/stories', { body: { author: 'Sam', contact: '@samsbakes', title: 'How I started', body: 'x'.repeat(120), started_at: Date.now() - 10000 } });
  assert.equal(res.status, 201);
  assert.equal((await jsonOf(await call(env, 'GET', '/api/stories'))).stories.length, 0);
  const token = await login(env);
  const id = (await jsonOf(await call(env, 'GET', '/api/admin/stories', { token }))).stories[0].id;
  await call(env, 'PATCH', `/api/admin/stories/${id}`, { token, body: { status: 'published' } });
  const pub = (await jsonOf(await call(env, 'GET', '/api/stories'))).stories;
  assert.equal(pub.length, 1);
  assert.equal(pub[0].contact, undefined, 'contact stays private');
});

test('CORS: unknown origins get no CORS headers', async () => {
  const env = fakeEnv();
  const res = await worker.fetch(new Request(API + '/api/health', { headers: { origin: 'https://evil.example' } }), env);
  assert.equal(res.headers.get('access-control-allow-origin'), null);
});
