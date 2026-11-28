/*
 * Home and Marketplace pages: the illustrated street (today's featured
 * businesses, chosen by the shared rotation) plus either today's list (home)
 * or the full searchable directory (marketplace).
 */
import { api, forStall } from './api.js';
import { streetPlan } from './rotation.js';
import { CATEGORIES, KINDS, CITIES } from './catalog.js';
import { $, $$, esc, root, bootChrome, setupProfileDialog, openProfile, openFreeStall, cardHtml } from './ui.js';

bootChrome();

const page = document.body.dataset.page; // 'home' | 'marketplace'
let streetApi = null;

async function start() {
  let data;
  try {
    data = await api.market();
  } catch (err) {
    const msg = $('#market-error');
    if (msg) { msg.hidden = false; msg.textContent = err.message; }
    data = { businesses: [], featured: [] };
  }
  const all = data.businesses.map(forStall);
  const byId = new Map(all.map((b) => [b.id, b]));
  const featured = data.featured.map((id) => byId.get(id)).filter(Boolean);
  const featuredIds = new Set(featured.map((b) => b.id));

  setupProfileDialog({ onClosed: (b) => { if (b && streetApi && featuredIds.has(b.id)) streetApi.focusBusiness(b.id); } });
  streetApi = window.TH.mountStreet({
    businesses: featured,
    plan: streetPlan(featured.length),
    onOpen: (b) => openProfile(b, featured),
    onOpenFree: openFreeStall
  });
  if (streetApi) window.TH.mountCrowd({ occupiedSlots: streetApi.occupiedSlots });

  $$('[data-count="featured"]').forEach((n) => (n.textContent = String(featured.length)));
  $$('[data-count="all"]').forEach((n) => (n.textContent = String(all.length)));

  if (page === 'home') renderToday(featured);
  if (page === 'marketplace') renderDirectory(all, featuredIds);
}

/* ---------------- home: today's stalls ---------------- */
function renderToday(featured) {
  const list = $('#stall-list');
  if (!list) return;
  if (!featured.length) {
    list.innerHTML = `<li class="empty-state">The first stalls are being set up. <a href="${root()}get-listed/">Apply for a free listing</a>.</li>`;
    return;
  }
  // a fresh order on every visit, so nobody is always first in the list
  const shown = featured.slice();
  for (let i = shown.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shown[i], shown[j]] = [shown[j], shown[i]]; }
  list.innerHTML = shown.map((b) => `<li>${cardHtml(b, { featured: true })}</li>`).join('');
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.biz-open');
    if (btn) openProfile(featured.find((b) => b.id === btn.dataset.id), featured);
  });
}

/* ---------------- marketplace: searchable directory ---------------- */
function renderDirectory(all, featuredIds) {
  const form = $('#directory-filters');
  const results = $('#directory-results');
  const count = $('#directory-count');
  if (!form || !results) return;

  // fill selects
  $('#f-kind').insertAdjacentHTML('beforeend', KINDS.map((k) => `<option value="${k.id}">${esc(k.label)}</option>`).join(''));
  const cities = CITIES.filter((c) => (c === 'Other' ? all.some((b) => !CITIES.includes(b.city)) : all.some((b) => b.city === c)));
  $('#f-city').insertAdjacentHTML('beforeend', cities.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join(''));

  // restore filters from the address (shareable searches)
  const params = new URLSearchParams(location.search);
  form.q.value = params.get('q') || '';
  form.kind.value = params.get('kind') || '';
  form.city.value = params.get('city') || '';
  const cat = params.get('cat') || '';
  $$('input[name="cat"]', form).forEach((r) => (r.checked = r.value === cat));
  form.today.checked = params.get('today') === '1';

  const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  let shown = [];
  function apply() {
    const q = norm(form.q.value.trim());
    const c = (form.querySelector('input[name="cat"]:checked') || {}).value || '';
    const kind = form.kind.value;
    const city = form.city.value;
    const today = form.today.checked;
    shown = all.filter((b) =>
      (!c || b.category === c) &&
      (!kind || b.kind === kind) &&
      (!city || b.city === city || (city === 'Other' && !CITIES.includes(b.city))) &&
      (!today || featuredIds.has(b.id)) &&
      (!q || norm([b.name, b.type, b.summary, b.description, b.area, b.city].join(' ')).includes(q)));
    results.innerHTML = shown.length
      ? shown.map((b) => cardHtml(b, { featured: featuredIds.has(b.id) })).join('')
      : `<p class="empty-state">No business matches these filters yet. <button type="button" class="link-button" id="clear-filters">Clear the filters</button></p>`;
    count.textContent = `${shown.length} ${shown.length === 1 ? 'business' : 'businesses'}`;
    const p = new URLSearchParams();
    if (form.q.value.trim()) p.set('q', form.q.value.trim());
    if (c) p.set('cat', c);
    if (kind) p.set('kind', kind);
    if (city) p.set('city', city);
    if (today) p.set('today', '1');
    history.replaceState(null, '', location.pathname + (p.toString() ? `?${p}` : '') + location.hash);
  }
  form.addEventListener('input', apply);
  form.addEventListener('submit', (e) => { e.preventDefault(); apply(); });
  results.addEventListener('click', (e) => {
    const btn = e.target.closest('.biz-open');
    if (btn) openProfile(shown.find((b) => b.id === btn.dataset.id), shown);
    if (e.target.id === 'clear-filters') { form.reset(); $$('input[name="cat"]', form).forEach((r) => (r.checked = r.value === '')); apply(); form.q.focus(); }
  });
  apply();
  // category legend counts
  for (const [id] of Object.entries(CATEGORIES)) {
    const n = all.filter((b) => b.category === id).length;
    $$(`[data-count="${id}"]`).forEach((el) => (el.textContent = String(n)));
  }
}

start();
