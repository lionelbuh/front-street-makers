/*
 * Data access for every page. Two interchangeable back ends:
 *   remote  — the Cloudflare Worker at CONFIG.API_BASE
 *   demo    — a small database kept in this browser's localStorage, seeded with
 *             the sample stalls, so the whole flow (apply → review → approve →
 *             appear on the street) can be tried before the API exists.
 */
import { CONFIG, DEMO_MODE } from './config.js';
import { DEMO_BUSINESSES } from './demo-businesses.js';
import { featuredForDate, normalizeSettings, todayInTemecula, addDays, DEFAULT_SETTINGS } from './rotation.js';
import { CATEGORIES, KIND_BY_ID, CITIES, LICENSE_OPTIONS, STATUS_IDS, initialStatus, slugify, defaultStall } from './catalog.js';

export class ApiError extends Error {
  constructor(message, status = 0, fields = null) { super(message); this.status = status; this.fields = fields; }
}

/* ======================================================================
   Remote back end
   ====================================================================== */
const TOKEN_KEY = 'th-admin-token';
function adminToken() { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } }
function setAdminToken(t) { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } }

async function request(path, { method = 'GET', body, form, admin = false } = {}) {
  const headers = {};
  if (admin) headers.authorization = `Bearer ${adminToken()}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { payload = JSON.stringify(body); headers['content-type'] = 'application/json'; }
  let res;
  try {
    res = await fetch(CONFIG.API_BASE.replace(/\/$/, '') + path, { method, headers, body: payload });
  } catch {
    throw new ApiError('We could not reach Temecula Homegrown. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && admin) setAdminToken('');
    throw new ApiError(data.error || 'Something went wrong. Please try again.', res.status, data.fields || null);
  }
  return data;
}

const remote = {
  mode: 'live',
  market: (date) => request('/api/market' + (date ? `?date=${date}` : '')),
  business: async (slug) => (await request(`/api/businesses/${encodeURIComponent(slug)}`)).business,
  stories: async () => (await request('/api/stories')).stories,
  apply: (form) => request('/api/applications', { method: 'POST', form }),
  submitStory: (form) => request('/api/stories', { method: 'POST', form }),
  admin: {
    signedIn: () => Boolean(adminToken()),
    async login(password) { const r = await request('/api/admin/login', { method: 'POST', body: { password } }); setAdminToken(r.token); },
    logout() { setAdminToken(''); },
    list: (status) => request('/api/admin/businesses' + (status ? `?status=${status}` : ''), { admin: true }),
    get: (id) => request(`/api/admin/businesses/${id}`, { admin: true }),
    update: (id, patch) => request(`/api/admin/businesses/${id}`, { method: 'PATCH', body: patch, admin: true }),
    remove: (id) => request(`/api/admin/businesses/${id}`, { method: 'DELETE', admin: true }),
    addPhotos: (id, form) => request(`/api/admin/businesses/${id}/photos`, { method: 'POST', form, admin: true }),
    deletePhoto: (id, pid) => request(`/api/admin/businesses/${id}/photos/${pid}`, { method: 'DELETE', admin: true }),
    settings: () => request('/api/admin/settings', { admin: true }),
    saveSettings: (s) => request('/api/admin/settings', { method: 'PUT', body: s, admin: true }),
    rotation: (days = 7) => request(`/api/admin/rotation?days=${days}`, { admin: true }),
    stories: () => request('/api/admin/stories', { admin: true }),
    updateStory: (id, status) => request(`/api/admin/stories/${id}`, { method: 'PATCH', body: { status }, admin: true }),
    photoUrl: (url) => `${url}${url.includes('?') ? '&' : '?'}t=${encodeURIComponent(adminToken())}`
  }
};

/* ======================================================================
   Demo back end (this browser only)
   ====================================================================== */
const DEMO_KEY = 'th-demo-db-v1';
const nowIso = () => new Date().toISOString();
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

function seedDemo() {
  const rows = DEMO_BUSINESSES.map((b) => ({
    id: b.id, created_at: b.publishedAt + 'T16:00:00.000Z', updated_at: b.publishedAt + 'T16:00:00.000Z', status: 'approved',
    published_at: b.publishedAt + 'T16:00:00.000Z', slug: b.slug, category: b.category, name: b.name, kind: b.kind, type_label: b.type,
    summary: b.summary, description: b.description, city: b.city, area: b.area, website: b.links.website, order_url: b.links.order,
    instagram: b.links.instagram, facebook: b.links.facebook, tiktok: b.links.tiktok, public_email: b.links.email, public_phone: b.links.phone,
    stall: b.stall, owner_name: 'Demo owner', contact_email: 'demo@example.com', contact_phone: '', zip: '92590',
    license_status: 'ready', wants_help: 0, independent_ok: 1, notes: 'Demo record.', photos: [], isDemo: true,
    history: [{ at: nowIso(), action: 'seeded', detail: 'demo data' }]
  }));
  const pending = [
    { name: 'Sample Tamale Kitchen', category: 'home', kind: 'baked', type_label: 'Cottage Food · seasonal tamales', city: 'Murrieta', license_status: 'unsure', wants_help: 1 },
    { name: 'Sample Bike Repair', category: 'micro', kind: 'services', type_label: 'Mobile bicycle repair', city: 'Temecula', license_status: 'started', wants_help: 0 },
    { name: 'Sample Macramé Studio', category: 'home', kind: 'textiles', type_label: 'Handmade wall hangings', city: 'Menifee', license_status: 'ready', wants_help: 0 }
  ].map((p, i) => {
    const id = `demo-app-${i + 1}`;
    return {
      id, created_at: addDays(todayInTemecula(), -i) + 'T17:30:00.000Z', updated_at: nowIso(), status: initialStatus(p.license_status, p.wants_help),
      published_at: null, slug: slugify(p.name), category: p.category, name: p.name, kind: p.kind, type_label: p.type_label,
      summary: 'Demo application to try the review workflow.', description: 'This application is part of the demo data.', city: p.city,
      area: `${p.city} and nearby`, website: '', order_url: '', instagram: '', facebook: '', tiktok: '', public_email: '', public_phone: '',
      stall: defaultStall(p.kind, id), owner_name: 'Demo applicant', contact_email: `applicant${i + 1}@example.com`, contact_phone: '',
      zip: '92562', license_status: p.license_status, wants_help: p.wants_help, independent_ok: 1, notes: '', photos: [], isDemo: true,
      history: [{ at: nowIso(), action: 'applied', detail: 'demo data' }]
    };
  });
  return {
    businesses: [...rows, ...pending],
    settings: { ...DEFAULT_SETTINGS },
    stories: [{ id: 'demo-story-1', created_at: nowIso(), status: 'pending', author: 'Demo author', business: 'Sample Sourdough Co.', email: 'demo@example.com', title: 'Demo story waiting for review', body: 'This is a demo community story. In the admin dashboard you can publish it to see how stories appear on the Community page.' }]
  };
}
function loadDemo() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through */ }
  const db = seedDemo();
  saveDemo(db);
  return db;
}
function saveDemo(db) {
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(db)); } catch { /* storage full or blocked: keep in memory */ }
  memo = db;
}
let memo = null;
const demoDb = () => memo || (memo = loadDemo());

function demoPublic(r) {
  return {
    id: r.id, slug: r.slug, name: r.name, category: r.category, kind: r.kind,
    type: r.type_label || (KIND_BY_ID[r.kind] || {}).label || '', summary: r.summary || '', description: r.description || '',
    city: r.city || '', area: r.area || '',
    links: { website: r.website || '', order: r.order_url || '', instagram: r.instagram || '', facebook: r.facebook || '', tiktok: r.tiktok || '', email: r.public_email || '', phone: r.public_phone || '' },
    photos: (r.photos || []).map((p) => ({ url: p.url, alt: p.alt || r.name })),
    stall: r.stall || defaultStall(r.kind, r.id), publishedAt: r.published_at, isDemo: true
  };
}
const fieldErr = (fields) => new ApiError('Some answers need attention.', 422, fields);
const tidyUrl = (v) => {
  let s = String(v || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try { return new URL(s).toString(); } catch { return ''; }
};
const social = (v, host) => {
  const s = String(v || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s) || s.includes('.')) return tidyUrl(s);
  return `https://www.${host}/${host === 'tiktok.com' ? '@' : ''}${s.replace(/^@/, '')}`;
};
async function fileToDataUrl(file, max = 900) {
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.72);
}
const isEmail = (v) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(v);

const demo = {
  mode: 'demo',
  async market(date) {
    const db = demoDb();
    const d = date || todayInTemecula();
    const businesses = db.businesses.filter((b) => b.status === 'approved').map(demoPublic).sort((a, b) => a.name.localeCompare(b.name));
    const { ids, reasons } = featuredForDate(businesses, db.settings, d);
    return { date: d, businesses, featured: ids, reasons };
  },
  async business(slug) {
    const r = demoDb().businesses.find((b) => b.slug === slug && b.status === 'approved');
    if (!r) throw new ApiError('This business is not listed.', 404);
    return demoPublic(r);
  },
  async stories() {
    return demoDb().stories.filter((s) => s.status === 'published').map(({ email, ...s }) => s);
  },
  async apply(form) {
    const g = (k) => String(form.get(k) || '').trim();
    const v = {
      category: g('category'), name: g('name'), kind: g('kind'), type_label: g('type_label'), summary: g('summary'), description: g('description'),
      city: g('city'), area: g('area'), website: tidyUrl(g('website')), order_url: tidyUrl(g('order_url')), instagram: social(g('instagram'), 'instagram.com'),
      facebook: social(g('facebook'), 'facebook.com'), tiktok: social(g('tiktok'), 'tiktok.com'), public_email: g('public_email'), public_phone: g('public_phone'),
      owner_name: g('owner_name'), contact_email: g('contact_email').toLowerCase(), contact_phone: g('contact_phone'), zip: g('zip'),
      license_status: g('license_status'), wants_help: g('wants_help') === 'yes' ? 1 : 0, independent_ok: form.get('independent_ok') ? 1 : 0
    };
    const errors = {};
    if (!CATEGORIES[v.category]) errors.category = 'Choose the category that fits your business.';
    if (v.name.length < 2) errors.name = 'Enter your business name.';
    if (!KIND_BY_ID[v.kind]) errors.kind = 'Choose what you offer.';
    if (v.summary.length < 10) errors.summary = 'Write one sentence about what you make or do.';
    if (!CITIES.includes(v.city)) errors.city = 'Choose your city.';
    if (v.area.length < 3) errors.area = 'Say where you serve customers (no street address needed).';
    if (v.owner_name.length < 2) errors.owner_name = 'Enter your name.';
    if (!isEmail(v.contact_email)) errors.contact_email = 'Enter an email address we can reach you at.';
    if (!LICENSE_OPTIONS.some((o) => o.id === v.license_status)) errors.license_status = 'Choose the answer that fits your situation.';
    if (!v.independent_ok) errors.independent_ok = 'Temecula Homegrown lists independent, owner-operated businesses only.';
    if (!form.get('agree')) errors.agree = 'Please accept the listing terms and privacy notice.';
    const files = form.getAll('photos').filter((f) => f && f.size);
    if (files.length && !form.get('photo_rights')) errors.photo_rights = 'Please confirm the photos are yours to share.';
    if (Object.keys(errors).length) throw fieldErr(errors);
    const db = demoDb();
    const id = uid();
    const status = initialStatus(v.license_status, v.wants_help);
    const photos = [];
    for (const f of files.slice(0, 6)) {
      try { photos.push({ id: uid(), url: await fileToDataUrl(f), alt: v.name }); } catch { /* skip unreadable */ }
    }
    let slug = slugify(v.name), n = 2;
    while (db.businesses.some((b) => b.slug === slug)) slug = `${slugify(v.name)}-${n++}`;
    db.businesses.unshift({ id, created_at: nowIso(), updated_at: nowIso(), status, published_at: null, slug, ...v, stall: defaultStall(v.kind, id), notes: '', photos, isDemo: true, history: [{ at: nowIso(), action: 'applied', detail: `status=${status}` }] });
    saveDemo(db);
    return { ok: true, status, needsGuidance: status !== 'new' };
  },
  async submitStory(form) {
    const g = (k) => String(form.get(k) || '').trim();
    const v = { author: g('author'), business: g('business'), email: g('email'), title: g('title'), body: g('body') };
    const errors = {};
    if (v.author.length < 2) errors.author = 'Enter your name.';
    if (!isEmail(v.email)) errors.email = 'Enter an email address we can reach you at.';
    if (v.title.length < 4) errors.title = 'Give your story a title.';
    if (v.body.length < 80) errors.body = 'Tell us a little more (at least a few sentences).';
    if (Object.keys(errors).length) throw fieldErr(errors);
    const db = demoDb();
    db.stories.unshift({ id: uid(), created_at: nowIso(), status: 'pending', ...v });
    saveDemo(db);
    return { ok: true };
  },
  admin: {
    signedIn: () => { try { return sessionStorage.getItem(TOKEN_KEY) === 'demo'; } catch { return false; } },
    async login(password) {
      if (password !== 'demo') throw new ApiError('In demo mode the password is “demo”.', 401);
      setAdminToken('demo');
    },
    logout() { setAdminToken(''); },
    async list(status) {
      const db = demoDb();
      const counts = Object.fromEntries(STATUS_IDS.map((s) => [s, 0]));
      db.businesses.forEach((b) => { counts[b.status] = (counts[b.status] || 0) + 1; });
      const rows = db.businesses.filter((b) => !status || b.status === status).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return { businesses: rows, counts };
    },
    async get(id) {
      const r = demoDb().businesses.find((b) => b.id === id);
      if (!r) throw new ApiError('Not found.', 404);
      return { business: { ...r }, photos: r.photos || [], history: [...(r.history || [])].reverse() };
    },
    async update(id, patch) {
      const db = demoDb();
      const r = db.businesses.find((b) => b.id === id);
      if (!r) throw new ApiError('Not found.', 404);
      const before = r.status;
      for (const [k, v] of Object.entries(patch)) {
        if (k === 'stall') r.stall = { ...(r.stall || {}), ...v };
        else if (['website', 'order_url'].includes(k)) r[k] = tidyUrl(v);
        else if (k === 'instagram') r[k] = social(v, 'instagram.com');
        else if (k === 'facebook') r[k] = social(v, 'facebook.com');
        else if (k === 'tiktok') r[k] = social(v, 'tiktok.com');
        else r[k] = v;
      }
      if (patch.status === 'approved' && !r.published_at) r.published_at = nowIso();
      r.updated_at = nowIso();
      r.history = r.history || [];
      if (patch.status && patch.status !== before) r.history.push({ at: nowIso(), action: 'status', detail: `${before} → ${patch.status}` });
      else r.history.push({ at: nowIso(), action: 'edited', detail: Object.keys(patch).join(', ') });
      saveDemo(db);
      return { ok: true };
    },
    async remove(id) {
      const db = demoDb();
      db.businesses = db.businesses.filter((b) => b.id !== id);
      saveDemo(db);
      return { ok: true };
    },
    async addPhotos(id, form) {
      const db = demoDb();
      const r = db.businesses.find((b) => b.id === id);
      for (const f of form.getAll('photos')) {
        if (!f || !f.size || r.photos.length >= 6) continue;
        r.photos.push({ id: uid(), url: await fileToDataUrl(f), alt: r.name });
      }
      saveDemo(db);
      return { ok: true };
    },
    async deletePhoto(id, pid) {
      const db = demoDb();
      const r = db.businesses.find((b) => b.id === id);
      r.photos = r.photos.filter((p) => p.id !== pid);
      saveDemo(db);
      return { ok: true };
    },
    async settings() { return { settings: normalizeSettings(demoDb().settings) }; },
    async saveSettings(s) {
      const db = demoDb();
      db.settings = normalizeSettings(s);
      saveDemo(db);
      return { ok: true, settings: db.settings };
    },
    async rotation(days = 7) {
      const db = demoDb();
      const businesses = db.businesses.filter((b) => b.status === 'approved').map(demoPublic);
      const out = [];
      for (let i = 0; i < days; i++) {
        const date = addDays(todayInTemecula(), i);
        const { ids, reasons } = featuredForDate(businesses, db.settings, date);
        out.push({ date, featured: ids.map((id) => ({ id, name: businesses.find((b) => b.id === id).name, reason: reasons[id] })) });
      }
      return { days: out, approved: businesses.length, settings: normalizeSettings(db.settings) };
    },
    async stories() { return { stories: demoDb().stories }; },
    async updateStory(id, status) {
      const db = demoDb();
      const s = db.stories.find((x) => x.id === id);
      if (s) s.status = status;
      saveDemo(db);
      return { ok: true };
    },
    photoUrl: (url) => url,
    resetDemo() { try { localStorage.removeItem(DEMO_KEY); } catch { /* ignore */ } memo = null; }
  }
};

export const api = DEMO_MODE ? demo : remote;

/** Business record with the stall look flattened, as the stall renderer expects. */
export function forStall(b) {
  const st = b.stall || {};
  return { ...b, display: st.display, roof: st.roof, colors: st.colors, valance: st.valance, chalk: st.chalk, flowers: st.flowers };
}
