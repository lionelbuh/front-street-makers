/*
 * Front Street Makers API — Cloudflare Worker
 *
 * Bindings (see wrangler.toml and docs/SETUP.md):
 *   DB      D1 database (schema in worker/schema.sql)
 *   PHOTOS  R2 bucket for business photos
 * Secrets / vars:
 *   ADMIN_PASSWORD   password for the admin dashboard
 *   SESSION_SECRET   long random string used to sign admin sessions
 *   ALLOWED_ORIGINS  comma-separated site origins, e.g. https://frontstreetmakers.com
 *   TURNSTILE_SECRET (optional) Cloudflare Turnstile secret for the public forms
 *   RESEND_API_KEY, NOTIFY_EMAIL, FROM_EMAIL (optional) email the admin on new applications
 *
 * Privacy rule: we only collect what businesses already make public, plus two
 * private items: the owner's first name and the licensing answers. Public
 * endpoints return approved businesses' public fields only; first name,
 * licensing answers and internal notes are returned by admin endpoints only.
 */
import { featuredForDate, normalizeSettings, todayInTemecula, addDays, DEFAULT_SETTINGS } from '../../src/assets/js/app/rotation.js';
import {
  CATEGORIES, KIND_BY_ID, CITIES, LICENSE_OPTIONS, STATUS_IDS, initialStatus, slugify, defaultStall, ROOFS, VALANCES
} from '../../src/assets/js/app/catalog.js';

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const SESSION_HOURS = 12;
const DISPLAYS = ['bakery', 'honey', 'candles', 'soap', 'jewelry', 'ceramics', 'art', 'textiles', 'leather', 'plants', 'services'];

/* ------------------------------------------------------------------ utils */
const nowIso = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
}
class HttpError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; }
}
const fail = (status, message, fields) => { throw new HttpError(status, message, fields); };

/** Trim, collapse control characters and cap length. */
export function text(v, max = 200) {
  if (v == null) return '';
  return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n/g, '\n').trim().slice(0, max);
}
export function isEmail(v) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(v) && v.length <= 160;
}
/** Accepts "example.com", "https://example.com/x"; returns a normalized https URL or ''. */
export function cleanUrl(v) {
  let s = text(v, 300);
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try {
    const u = new URL(s);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return '';
    return u.toString();
  } catch { return ''; }
}
/** "@handle", "handle" or a profile URL → profile URL on the given site. */
export function socialUrl(v, host) {
  const s = text(v, 200);
  if (!s) return '';
  if (/^https?:\/\//i.test(s) || s.includes('.')) {
    const u = cleanUrl(s);
    return u && new URL(u).hostname.replace(/^www\./, '').endsWith(host) ? u : '';
  }
  const handle = s.replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, '');
  return handle ? `https://www.${host}/${host === 'tiktok.com' ? '@' : ''}${handle}` : '';
}
const phone = (v) => text(v, 30).replace(/[^0-9+().\s-]/g, '');

/* ------------------------------------------------------------------ CORS */
function corsHeaders(request, env) {
  const origin = request.headers.get('origin');
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (origin && (allowed.includes(origin) || allowed.includes('*'))) {
    return {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
      'access-control-max-age': '86400',
      vary: 'origin'
    };
  }
  return {};
}

/* ------------------------------------------------------------------ admin sessions */
const enc = new TextEncoder();
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}
async function sameSecret(a, b, secret) {
  // compare HMACs so the comparison time does not depend on the password
  return (await hmac(secret, 'pw|' + a)) === (await hmac(secret, 'pw|' + b));
}
export async function makeToken(env, hours = SESSION_HOURS) {
  const payload = b64url(enc.encode(JSON.stringify({ exp: Date.now() + hours * 3600000 })));
  return `${payload}.${await hmac(env.SESSION_SECRET, payload)}`;
}
async function verifyToken(env, token) {
  if (!token || !env.SESSION_SECRET) return false;
  const [payload, sig] = String(token).split('.');
  if (!payload || !sig || (await hmac(env.SESSION_SECRET, payload)) !== sig) return false;
  try {
    const { exp } = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return Date.now() < exp;
  } catch { return false; }
}
async function requireAdmin(request, env, url) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : url.searchParams.get('t');
  if (!(await verifyToken(env, token))) fail(401, 'Please sign in again.');
}

/* ------------------------------------------------------------------ spam checks */
async function checkHuman(form, request, env) {
  if (text(form.get('company_website'))) fail(400, 'Submission rejected.'); // honeypot
  const started = Number(form.get('started_at'));
  if (started && Date.now() - started < 3000) fail(400, 'That was quick. Please review the form and send it again.');
  if (env.TURNSTILE_SECRET) {
    const token = text(form.get('cf-turnstile-response'), 2048);
    const body = new FormData();
    body.append('secret', env.TURNSTILE_SECRET);
    body.append('response', token);
    const ip = request.headers.get('cf-connecting-ip');
    if (ip) body.append('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const out = await res.json().catch(() => ({}));
    if (!out.success) fail(400, 'Please complete the verification and try again.');
  }
}
/** Accept either multipart form data or JSON as a Map-like getter. */
async function readForm(request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('multipart/form-data') || type.includes('application/x-www-form-urlencoded')) return request.formData();
  const data = await request.json().catch(() => fail(400, 'Invalid request.'));
  return { get: (k) => (data[k] == null ? null : data[k]), getAll: (k) => (Array.isArray(data[k]) ? data[k] : data[k] == null ? [] : [data[k]]) };
}

/* ------------------------------------------------------------------ data access */
async function uniqueSlug(db, name, exceptId = null) {
  const base = slugify(name);
  for (let i = 0; i < 50; i++) {
    const slug = i ? `${base}-${i + 1}` : base;
    const row = await db.prepare('SELECT id FROM businesses WHERE slug = ?').bind(slug).first();
    if (!row || row.id === exceptId) return slug;
  }
  return `${base}-${uid().slice(0, 6)}`;
}
async function getSettings(db) {
  const row = await db.prepare("SELECT value FROM settings WHERE key = 'rotation'").first();
  return normalizeSettings(row ? JSON.parse(row.value) : DEFAULT_SETTINGS);
}
async function audit(db, businessId, action, detail = '') {
  await db.prepare('INSERT INTO audit (at, business_id, action, detail) VALUES (?, ?, ?, ?)').bind(nowIso(), businessId, action, text(detail, 1000)).run();
}
async function photosFor(db, ids) {
  if (!ids.length) return new Map();
  const rows = (await db.prepare(`SELECT * FROM photos WHERE business_id IN (${ids.map(() => '?').join(',')}) ORDER BY sort, created_at`).bind(...ids).all()).results;
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.business_id)) map.set(r.business_id, []);
    map.get(r.business_id).push(r);
  }
  return map;
}
function stallOf(row) {
  let colors = null;
  try { colors = JSON.parse(row.stall_colors || 'null'); } catch { colors = null; }
  const d = defaultStall(row.kind, row.id);
  return {
    display: row.stall_display || d.display,
    roof: row.stall_roof || d.roof,
    colors: Array.isArray(colors) && colors.length === 3 ? colors : d.colors,
    valance: row.stall_valance || d.valance,
    chalk: row.stall_chalk || ''
  };
}
/** The only shape the public ever sees. */
export function publicBusiness(row, photos, origin) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    kind: row.kind,
    type: row.type_label || (KIND_BY_ID[row.kind] || {}).label || '',
    summary: row.summary || '',
    description: row.description || '',
    city: row.city || '',
    area: row.area || '',
    links: {
      website: row.website || '', order: row.order_url || '', instagram: row.instagram || '',
      facebook: row.facebook || '', tiktok: row.tiktok || '', email: row.public_email || '', phone: row.public_phone || ''
    },
    photos: (photos || []).map((p) => ({ url: `${origin}/media/${p.r2_key}`, alt: p.alt || row.name })),
    stall: stallOf(row),
    publishedAt: row.published_at
  };
}
async function approvedBusinesses(db, origin) {
  const rows = (await db.prepare("SELECT * FROM businesses WHERE status = 'approved' ORDER BY name COLLATE NOCASE").all()).results;
  const photos = await photosFor(db, rows.map((r) => r.id));
  return rows.map((r) => publicBusiness(r, photos.get(r.id), origin));
}

async function savePhotos(env, businessId, files, altBase) {
  const existing = await env.DB.prepare('SELECT COUNT(*) AS n FROM photos WHERE business_id = ?').bind(businessId).first();
  let sort = existing ? existing.n : 0;
  const saved = [];
  for (const f of files) {
    if (!f || typeof f === 'string' || !f.size) continue;
    if (sort >= MAX_PHOTOS) break;
    const ext = IMAGE_TYPES[f.type];
    if (!ext) fail(400, 'Photos must be JPEG, PNG or WebP images.');
    if (f.size > MAX_PHOTO_BYTES) fail(400, 'Each photo must be under 3 MB.');
    const id = uid();
    const key = `businesses/${businessId}/${id}.${ext}`;
    await env.PHOTOS.put(key, await f.arrayBuffer(), { httpMetadata: { contentType: f.type } });
    await env.DB.prepare('INSERT INTO photos (id, business_id, r2_key, alt, sort, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, businessId, key, text(altBase, 120), sort++, nowIso()).run();
    saved.push(id);
  }
  return saved;
}

async function notifyAdmin(env, subject, body) {
  if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.FROM_EMAIL || 'Front Street Makers <onboarding@resend.dev>', to: [env.NOTIFY_EMAIL], subject, text: body })
    });
  } catch { /* notification is best effort */ }
}

/* ------------------------------------------------------------------ public handlers */
async function createApplication(request, env) {
  const form = await readForm(request);
  await checkHuman(form, request, env);
  const errors = {};
  const v = {
    category: text(form.get('category'), 10),
    name: text(form.get('name'), 80),
    kind: text(form.get('kind'), 20),
    type_label: text(form.get('type_label'), 80),
    summary: text(form.get('summary'), 160),
    description: text(form.get('description'), 1500),
    city: text(form.get('city'), 40),
    area: text(form.get('area'), 160),
    website: cleanUrl(form.get('website')),
    order_url: cleanUrl(form.get('order_url')),
    instagram: socialUrl(form.get('instagram'), 'instagram.com'),
    facebook: socialUrl(form.get('facebook'), 'facebook.com'),
    tiktok: socialUrl(form.get('tiktok'), 'tiktok.com'),
    public_email: text(form.get('public_email'), 160),
    public_phone: phone(form.get('public_phone')),
    first_name: text(form.get('first_name'), 40),
    license_status: text(form.get('license_status'), 20),
    wants_help: text(form.get('wants_help'), 5) === 'yes' ? 1 : 0,
    independent_ok: form.get('independent_ok') ? 1 : 0
  };
  if (!CATEGORIES[v.category]) errors.category = 'Choose the category that fits your business.';
  if (v.name.length < 2) errors.name = 'Enter your business name.';
  if (!KIND_BY_ID[v.kind]) errors.kind = 'Choose what you offer.';
  if (v.summary.length < 10) errors.summary = 'Write one sentence about what you make or do.';
  if (v.city === 'Other') {
    const other = text(form.get('city_other'), 40);
    if (other.length < 2) errors.city_other = 'Tell us which city.';
    else v.city = other;
  } else if (!CITIES.includes(v.city)) errors.city = 'Choose your city.';
  if (v.area.length < 3) errors.area = 'Say where you serve customers (no street address needed).';
  if (v.public_email && !isEmail(v.public_email)) errors.public_email = 'This email address does not look right.';
  if (v.first_name.length < 1) errors.first_name = 'Enter your first name.';
  if (![v.public_email, v.public_phone, v.website, v.order_url, v.instagram, v.facebook, v.tiktok].some(Boolean)) {
    errors.public_email = 'Add at least one way for neighbors (and us) to reach your business: an email, phone, website or social account.';
  }
  if (!LICENSE_OPTIONS.some((o) => o.id === v.license_status)) errors.license_status = 'Choose the answer that fits your situation.';
  if (!v.independent_ok) errors.independent_ok = 'Front Street Makers lists independent, owner-operated businesses only.';
  if (!form.get('agree')) errors.agree = 'Please accept the listing terms and privacy notice.';
  const files = form.getAll('photos').filter((f) => f && typeof f !== 'string' && f.size);
  if (files.length && !form.get('photo_rights')) errors.photo_rights = 'Please confirm the photos are yours to share.';
  if (files.length > MAX_PHOTOS) errors.photos = `Up to ${MAX_PHOTOS} photos.`;
  if (Object.keys(errors).length) fail(422, 'Some answers need attention.', errors);

  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM businesses WHERE lower(name) = lower(?) AND created_at > ?')
    .bind(v.name, new Date(Date.now() - 86400000).toISOString()).first();
  if (recent && recent.n >= 2) fail(429, 'We already received an application for this business today. We will be in touch.');

  const id = uid();
  const t = nowIso();
  const status = initialStatus(v.license_status, v.wants_help);
  const slug = await uniqueSlug(env.DB, v.name);
  const stall = defaultStall(v.kind, id);
  await env.DB.prepare(`INSERT INTO businesses (id, created_at, updated_at, status, slug, category, name, kind, type_label, summary, description,
      city, area, website, order_url, instagram, facebook, tiktok, public_email, public_phone, stall_display, stall_roof, stall_colors, stall_valance,
      first_name, license_status, wants_help, independent_ok)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, t, t, status, slug, v.category, v.name, v.kind, v.type_label, v.summary, v.description, v.city, v.area, v.website, v.order_url,
      v.instagram, v.facebook, v.tiktok, v.public_email, v.public_phone, stall.display, stall.roof, JSON.stringify(stall.colors), stall.valance,
      v.first_name, v.license_status, v.wants_help, v.independent_ok)
    .run();
  await savePhotos(env, id, files, v.name);
  await audit(env.DB, id, 'applied', `status=${status}`);
  await notifyAdmin(env, `New listing application: ${v.name}`,
    `${v.name} (${CATEGORIES[v.category].label}) applied from ${v.city}.\nLicensing: ${v.license_status}${v.wants_help ? ', wants help' : ''}.\nStatus: ${status}.`);
  return json({ ok: true, status, needsGuidance: status !== 'new' }, 201);
}

async function createStory(request, env) {
  const form = await readForm(request);
  await checkHuman(form, request, env);
  const v = {
    author: text(form.get('author'), 80), business: text(form.get('business'), 80),
    contact: text(form.get('contact'), 160), title: text(form.get('title'), 120), body: text(form.get('body'), 4000)
  };
  const errors = {};
  if (v.author.length < 2) errors.author = 'Enter your name.';
  if (v.contact.length < 3) errors.contact = 'Add a business email or social handle so we can confirm with you before publishing.';
  if (v.title.length < 4) errors.title = 'Give your story a title.';
  if (v.body.length < 80) errors.body = 'Tell us a little more (at least a few sentences).';
  if (Object.keys(errors).length) fail(422, 'Some answers need attention.', errors);
  await env.DB.prepare('INSERT INTO stories (id, created_at, status, author, business, contact, title, body) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(uid(), nowIso(), 'pending', v.author, v.business, v.contact, v.title, v.body).run();
  await notifyAdmin(env, `New community story: ${v.title}`, `${v.author}${v.business ? ` (${v.business})` : ''} sent a story for review.`);
  return json({ ok: true }, 201);
}

async function market(env, url) {
  const origin = url.origin;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('date') || '') ? url.searchParams.get('date') : todayInTemecula();
  const businesses = await approvedBusinesses(env.DB, origin);
  const { ids, reasons } = featuredForDate(businesses, await getSettings(env.DB), date);
  return json({ date, businesses, featured: ids, reasons }, 200, { 'cache-control': 'public, max-age=120' });
}

async function media(request, env, url, key) {
  if (!/^businesses\/[0-9a-f-]+\/[0-9a-f-]+\.(jpg|png|webp)$/.test(key)) fail(404, 'Not found.');
  const row = await env.DB.prepare('SELECT b.status FROM photos p JOIN businesses b ON b.id = p.business_id WHERE p.r2_key = ?').bind(key).first();
  if (!row) fail(404, 'Not found.');
  const isPublic = row.status === 'approved';
  if (!isPublic) await requireAdmin(request, env, url);
  const obj = await env.PHOTOS.get(key);
  if (!obj) fail(404, 'Not found.');
  return new Response(obj.body, {
    headers: {
      'content-type': (obj.httpMetadata && obj.httpMetadata.contentType) || 'image/jpeg',
      'cache-control': isPublic ? 'public, max-age=86400' : 'private, no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

/* ------------------------------------------------------------------ admin handlers */
const ADMIN_LIST_FIELDS = 'id, created_at, updated_at, status, published_at, slug, category, name, kind, city, license_status, wants_help, first_name';

async function adminList(env, url) {
  const status = url.searchParams.get('status');
  const rows = STATUS_IDS.includes(status)
    ? (await env.DB.prepare(`SELECT ${ADMIN_LIST_FIELDS} FROM businesses WHERE status = ? ORDER BY created_at DESC`).bind(status).all()).results
    : (await env.DB.prepare(`SELECT ${ADMIN_LIST_FIELDS} FROM businesses ORDER BY created_at DESC`).all()).results;
  const counts = Object.fromEntries(STATUS_IDS.map((s) => [s, 0]));
  for (const r of (await env.DB.prepare('SELECT status, COUNT(*) AS n FROM businesses GROUP BY status').all()).results) counts[r.status] = r.n;
  return json({ businesses: rows, counts });
}
async function adminGet(env, url, id) {
  const row = await env.DB.prepare('SELECT * FROM businesses WHERE id = ?').bind(id).first();
  if (!row) fail(404, 'Not found.');
  const photos = (await photosFor(env.DB, [id])).get(id) || [];
  const history = (await env.DB.prepare('SELECT at, action, detail FROM audit WHERE business_id = ? ORDER BY id DESC LIMIT 50').bind(id).all()).results;
  return json({
    business: { ...row, stall: stallOf(row) },
    photos: photos.map((p) => ({ id: p.id, alt: p.alt, url: `${url.origin}/media/${p.r2_key}` })),
    history
  });
}
async function adminUpdate(request, env, id) {
  const row = await env.DB.prepare('SELECT * FROM businesses WHERE id = ?').bind(id).first();
  if (!row) fail(404, 'Not found.');
  const body = await request.json().catch(() => fail(400, 'Invalid request.'));
  const set = {};
  const errors = {};
  const textFields = { name: 80, type_label: 80, summary: 160, description: 1500, area: 160, first_name: 40, notes: 8000 };
  for (const [k, max] of Object.entries(textFields)) if (k in body) set[k] = text(body[k], max);
  for (const k of ['website', 'order_url']) if (k in body) set[k] = cleanUrl(body[k]);
  if ('instagram' in body) set.instagram = socialUrl(body.instagram, 'instagram.com');
  if ('facebook' in body) set.facebook = socialUrl(body.facebook, 'facebook.com');
  if ('tiktok' in body) set.tiktok = socialUrl(body.tiktok, 'tiktok.com');
  if ('public_phone' in body) set.public_phone = phone(body.public_phone);
  if ('public_email' in body) {
    set.public_email = text(body.public_email, 160);
    if (set.public_email && !isEmail(set.public_email)) errors.public_email = 'Invalid email.';
  }
  if ('category' in body) { if (CATEGORIES[body.category]) set.category = body.category; else errors.category = 'Unknown category.'; }
  if ('kind' in body) { if (KIND_BY_ID[body.kind]) set.kind = body.kind; else errors.kind = 'Unknown kind.'; }
  if ('city' in body) {
    const c = text(body.city, 40);
    if (c.length >= 2 && c !== 'Other') set.city = c; else errors.city = 'Enter a city.';
  }
  if ('license_status' in body) { if (LICENSE_OPTIONS.some((o) => o.id === body.license_status)) set.license_status = body.license_status; else errors.license_status = 'Unknown answer.'; }
  if ('wants_help' in body) set.wants_help = body.wants_help ? 1 : 0;
  if ('stall' in body && body.stall) {
    const st = body.stall;
    if (st.display) { if (DISPLAYS.includes(st.display)) set.stall_display = st.display; else errors.stall = 'Unknown stall display.'; }
    if (st.roof) { if (ROOFS.includes(st.roof)) set.stall_roof = st.roof; else errors.stall = 'Unknown roof.'; }
    if (st.valance) { if (VALANCES.includes(st.valance)) set.stall_valance = st.valance; else errors.stall = 'Unknown valance.'; }
    if (Array.isArray(st.colors)) {
      if (st.colors.length === 3 && st.colors.every((c) => /^#[0-9a-fA-F]{6}$/.test(c))) set.stall_colors = JSON.stringify(st.colors);
      else errors.stall = 'Colors must be three #RRGGBB values.';
    }
    if ('chalk' in st) set.stall_chalk = text(st.chalk, 24);
  }
  if ('slug' in body) set.slug = await uniqueSlug(env.DB, body.slug || row.name, id);
  if ('status' in body) {
    if (!STATUS_IDS.includes(body.status)) errors.status = 'Unknown status.';
    else {
      set.status = body.status;
      if (body.status === 'approved' && !row.published_at) set.published_at = nowIso();
    }
  }
  if (Object.keys(errors).length) fail(422, 'Some values need attention.', errors);
  const keys = Object.keys(set);
  if (keys.length) {
    set.updated_at = nowIso();
    const cols = Object.keys(set);
    await env.DB.prepare(`UPDATE businesses SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).bind(...cols.map((c) => set[c]), id).run();
    if (set.status && set.status !== row.status) await audit(env.DB, id, 'status', `${row.status} → ${set.status}`);
    const edited = keys.filter((k) => k !== 'status' && k !== 'notes' && k !== 'published_at');
    if (edited.length) await audit(env.DB, id, 'edited', edited.join(', '));
    if ('notes' in set && set.notes !== row.notes) await audit(env.DB, id, 'notes', 'internal notes updated');
  }
  return json({ ok: true });
}
async function adminDelete(env, id) {
  const photos = (await env.DB.prepare('SELECT r2_key FROM photos WHERE business_id = ?').bind(id).all()).results;
  for (const p of photos) await env.PHOTOS.delete(p.r2_key);
  await env.DB.prepare('DELETE FROM photos WHERE business_id = ?').bind(id).run();
  await env.DB.prepare('DELETE FROM businesses WHERE id = ?').bind(id).run();
  await audit(env.DB, id, 'deleted', 'business and photos removed');
  return json({ ok: true });
}
async function adminAddPhotos(request, env, id) {
  const row = await env.DB.prepare('SELECT name FROM businesses WHERE id = ?').bind(id).first();
  if (!row) fail(404, 'Not found.');
  const form = await request.formData();
  const saved = await savePhotos(env, id, form.getAll('photos'), row.name);
  await audit(env.DB, id, 'photos', `${saved.length} added`);
  return json({ ok: true, added: saved.length });
}
async function adminDeletePhoto(env, id, photoId) {
  const p = await env.DB.prepare('SELECT r2_key FROM photos WHERE id = ? AND business_id = ?').bind(photoId, id).first();
  if (!p) fail(404, 'Not found.');
  await env.PHOTOS.delete(p.r2_key);
  await env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(photoId).run();
  await audit(env.DB, id, 'photos', '1 removed');
  return json({ ok: true });
}
async function adminSettings(request, env) {
  if (request.method === 'PUT') {
    const body = await request.json().catch(() => fail(400, 'Invalid request.'));
    const s = normalizeSettings(body);
    await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('rotation', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(JSON.stringify(s)).run();
    await audit(env.DB, null, 'settings', JSON.stringify(s));
    return json({ ok: true, settings: s });
  }
  return json({ settings: await getSettings(env.DB) });
}
async function adminRotation(env, url) {
  const days = Math.min(31, Math.max(1, Number(url.searchParams.get('days')) || 7));
  const businesses = await approvedBusinesses(env.DB, url.origin);
  const settings = await getSettings(env.DB);
  const start = todayInTemecula();
  const out = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const { ids, reasons } = featuredForDate(businesses, settings, date);
    out.push({ date, featured: ids.map((id) => ({ id, name: businesses.find((b) => b.id === id).name, reason: reasons[id] })) });
  }
  return json({ days: out, approved: businesses.length, settings });
}
async function adminStories(request, env, id) {
  if (id && request.method === 'PATCH') {
    const body = await request.json().catch(() => fail(400, 'Invalid request.'));
    if (!['pending', 'published', 'archived'].includes(body.status)) fail(422, 'Unknown status.');
    await env.DB.prepare('UPDATE stories SET status = ? WHERE id = ?').bind(body.status, id).run();
    return json({ ok: true });
  }
  const rows = (await env.DB.prepare('SELECT * FROM stories ORDER BY created_at DESC').all()).results;
  return json({ stories: rows });
}

/* ------------------------------------------------------------------ router */
export async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const m = request.method;
  let match;

  if (m === 'GET' && path === '/api/health') return json({ ok: true });
  if (m === 'GET' && path === '/api/market') return market(env, url);
  if (m === 'GET' && (match = path.match(/^\/api\/businesses\/([a-z0-9-]+)$/))) {
    const row = await env.DB.prepare("SELECT * FROM businesses WHERE slug = ? AND status = 'approved'").bind(match[1]).first();
    if (!row) fail(404, 'This business is not listed.');
    const photos = (await photosFor(env.DB, [row.id])).get(row.id);
    return json({ business: publicBusiness(row, photos, url.origin) }, 200, { 'cache-control': 'public, max-age=120' });
  }
  if (m === 'POST' && path === '/api/applications') return createApplication(request, env);
  if (m === 'GET' && path === '/api/stories') {
    const rows = (await env.DB.prepare("SELECT id, created_at, author, business, title, body FROM stories WHERE status = 'published' ORDER BY created_at DESC LIMIT 50").all()).results;
    return json({ stories: rows }, 200, { 'cache-control': 'public, max-age=300' });
  }
  if (m === 'POST' && path === '/api/stories') return createStory(request, env);
  if (m === 'GET' && (match = path.match(/^\/media\/(.+)$/))) return media(request, env, url, decodeURIComponent(match[1]));

  if (m === 'POST' && path === '/api/admin/login') {
    const body = await request.json().catch(() => ({}));
    if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) fail(503, 'The admin password has not been configured yet.');
    if (!(await sameSecret(String(body.password || ''), env.ADMIN_PASSWORD, env.SESSION_SECRET))) {
      await new Promise((r) => setTimeout(r, 700));
      fail(401, 'That password is not correct.');
    }
    return json({ token: await makeToken(env), hours: SESSION_HOURS });
  }
  if (path.startsWith('/api/admin/')) {
    await requireAdmin(request, env, url);
    if (m === 'GET' && path === '/api/admin/businesses') return adminList(env, url);
    if ((match = path.match(/^\/api\/admin\/businesses\/([0-9a-f-]+)$/))) {
      if (m === 'GET') return adminGet(env, url, match[1]);
      if (m === 'PATCH') return adminUpdate(request, env, match[1]);
      if (m === 'DELETE') return adminDelete(env, match[1]);
    }
    if (m === 'POST' && (match = path.match(/^\/api\/admin\/businesses\/([0-9a-f-]+)\/photos$/))) return adminAddPhotos(request, env, match[1]);
    if (m === 'DELETE' && (match = path.match(/^\/api\/admin\/businesses\/([0-9a-f-]+)\/photos\/([0-9a-f-]+)$/))) return adminDeletePhoto(env, match[1], match[2]);
    if (path === '/api/admin/settings' && (m === 'GET' || m === 'PUT')) return adminSettings(request, env);
    if (m === 'GET' && path === '/api/admin/rotation') return adminRotation(env, url);
    if (path === '/api/admin/stories' && m === 'GET') return adminStories(request, env, null);
    if ((match = path.match(/^\/api\/admin\/stories\/([0-9a-f-]+)$/)) && m === 'PATCH') return adminStories(request, env, match[1]);
  }
  fail(404, 'Not found.');
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let res;
    try {
      res = await handle(request, env);
    } catch (err) {
      if (err instanceof HttpError) res = json({ error: err.message, fields: err.fields }, err.status);
      else {
        console.error(err);
        res = json({ error: 'Something went wrong on our side. Please try again.' }, 500);
      }
    }
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  }
};
