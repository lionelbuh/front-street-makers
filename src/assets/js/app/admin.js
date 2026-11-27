/* Admin dashboard: review applications, edit profiles, publish, tune the daily rotation, moderate stories. */
import { api, forStall } from './api.js';
import { DEMO_MODE } from './config.js';
import { CATEGORIES, KINDS, KIND_BY_ID, CITIES, LICENSE_OPTIONS, STATUSES, STALL_PALETTES, ROOFS, VALANCES } from './catalog.js';
import { todayInTemecula, addDays, MAX_FEATURED } from './rotation.js';
import { $, $$, esc, root, bootChrome, showFieldErrors } from './ui.js';

bootChrome();
const A = api.admin;
const DISPLAYS = [...new Set([...KINDS.map((k) => k.display), 'sweets'])];
const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.id, s.label]));
const LICENSE_LABEL = Object.fromEntries(LICENSE_OPTIONS.map((o) => [o.id, o.label]));
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const opt = (value, label, current) => `<option value="${esc(value)}"${value === current ? ' selected' : ''}>${esc(label)}</option>`;

let state = { tab: 'applications', status: '', query: '', rows: [], counts: {}, current: null, settings: null };

/* ---------------- sign in ---------------- */
function showLogin(message = '') {
  $('#admin-app').hidden = true;
  const box = $('#admin-login');
  box.hidden = false;
  $('#login-error').textContent = message;
  if (DEMO_MODE) $('#login-hint').hidden = false;
  $('#login-password').focus();
}
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await A.login($('#login-password').value);
    $('#login-password').value = '';
    showApp();
  } catch (err) { $('#login-error').textContent = err.message; }
});
$('#logout').addEventListener('click', () => { A.logout(); showLogin('Signed out.'); });

async function guard(fn) {
  try { return await fn(); } catch (err) {
    if (err.status === 401) showLogin('Your session ended. Please sign in again.');
    else toast(err.message, true);
    throw err;
  }
}
function toast(msg, isError = false) {
  const t = $('#admin-toast');
  t.textContent = msg;
  t.className = 'admin-toast' + (isError ? ' admin-toast--error' : '');
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 3500);
}

function showApp() {
  $('#admin-login').hidden = true;
  $('#admin-app').hidden = false;
  if (DEMO_MODE) $('#demo-reset').hidden = false;
  switchTab(state.tab);
}
$$('.admin-tabs button').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));
function switchTab(tab) {
  state.tab = tab;
  $$('.admin-tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  $$('.admin-panel').forEach((p) => (p.hidden = p.dataset.panel !== tab));
  if (tab === 'applications') loadList();
  if (tab === 'rotation') loadRotation();
  if (tab === 'stories') loadStories();
}
$('#demo-reset').addEventListener('click', () => { A.resetDemo(); toast('Demo data restored.'); switchTab(state.tab); });

/* ---------------- applications list ---------------- */
async function loadList() {
  const out = await guard(() => A.list(''));
  state.rows = out.businesses;
  state.counts = out.counts;
  renderFilters();
  renderList();
}
function renderFilters() {
  const total = Object.values(state.counts).reduce((a, b) => a + b, 0);
  $('#status-filters').innerHTML = [`<button type="button" data-status="" aria-pressed="${state.status === ''}">All <span>${total}</span></button>`,
    ...STATUSES.map((s) => `<button type="button" data-status="${s.id}" aria-pressed="${state.status === s.id}" class="st-${s.id}">${esc(s.label)} <span>${state.counts[s.id] || 0}</span></button>`)].join('');
}
$('#status-filters').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.status = b.dataset.status;
  renderFilters();
  renderList();
});
$('#admin-search').addEventListener('input', (e) => { state.query = e.target.value.toLowerCase(); renderList(); });
function renderList() {
  const rows = state.rows.filter((r) => (!state.status || r.status === state.status) &&
    (!state.query || `${r.name} ${r.first_name} ${r.city}`.toLowerCase().includes(state.query)));
  $('#app-list').innerHTML = rows.length ? rows.map((r) => `
    <tr data-id="${esc(r.id)}"${state.current && state.current.business.id === r.id ? ' aria-current="true"' : ''}>
      <td><button type="button" class="row-open">${esc(r.name)}</button><span class="row-sub">${esc(r.first_name)}</span></td>
      <td>${esc((CATEGORIES[r.category] || {}).short || '')}</td>
      <td>${esc(r.city || '')}</td>
      <td class="lic lic-${esc(r.license_status)}">${esc(shortLicense(r.license_status))}${r.wants_help ? ' · wants help' : ''}</td>
      <td><span class="status-pill st-${esc(r.status)}">${esc(STATUS_LABEL[r.status])}</span></td>
      <td class="num">${fmtDate(r.created_at)}</td>
    </tr>`).join('') : '<tr><td colspan="6" class="empty-state">No application matches.</td></tr>';
}
const shortLicense = (id) => ({ ready: 'Has licenses', unsure: 'Not sure', started: 'In progress', not_started: 'Not started', not_required: 'Believes none needed' }[id] || id);
$('#app-list').addEventListener('click', (e) => {
  const tr = e.target.closest('tr[data-id]');
  if (tr) openDetail(tr.dataset.id);
});

/* ---------------- application detail ---------------- */
async function openDetail(id) {
  const out = await guard(() => A.get(id));
  state.current = out;
  if (!state.settings) state.settings = (await guard(() => A.settings())).settings;
  renderDetail();
  renderList();
  const panel = $('#detail');
  panel.hidden = false;
  panel.focus();
  if (window.matchMedia('(max-width: 900px)').matches) panel.scrollIntoView({ block: 'start' });
}
function field(name, label, value, { type = 'text', max, rows, hint = '' } = {}) {
  const v = esc(value || '');
  const input = rows
    ? `<textarea id="d-${name}" name="${name}" rows="${rows}"${max ? ` maxlength="${max}"` : ''}>${v}</textarea>`
    : `<input id="d-${name}" name="${name}" type="${type}" value="${v}"${max ? ` maxlength="${max}"` : ''}>`;
  return `<div class="field"><label for="d-${name}">${label}</label>${input}${hint ? `<p class="hint">${hint}</p>` : ''}</div>`;
}
function renderDetail() {
  const { business: b, photos, history } = state.current;
  const st = b.stall || {};
  const pins = (state.settings.pins || []).filter((p) => p.id === b.id);
  $('#detail').innerHTML = `
  <form id="detail-form" class="detail-form" novalidate>
    <header class="detail-head">
      <div>
        <p class="card-kicker">${esc((CATEGORIES[b.category] || {}).label || '')} · applied ${fmtDate(b.created_at)}</p>
        <h2>${esc(b.name)}</h2>
        ${b.status === 'approved' ? `<p><a href="${root()}business/?b=${encodeURIComponent(b.slug)}" target="_blank">View the public page</a></p>` : '<p class="hint">Not public. Only “Approved for Publication” appears on the site.</p>'}
      </div>
      <button type="button" class="btn btn-ghost" id="detail-close">Close</button>
    </header>

    <section class="detail-sec detail-review">
      <h3>Review</h3>
      <div class="field"><label for="d-status">Status</label>
        <select id="d-status" name="status">${STATUSES.map((s) => opt(s.id, s.label, b.status)).join('')}</select></div>
      <div class="private-box">
        <p class="private-tag">Private · the only private details we keep</p>
        <dl class="kv">
          <div><dt>First name</dt><dd>${esc(b.first_name)}</dd></div>
          <div><dt>Reach them via</dt><dd>${esc([b.public_email, b.public_phone, b.instagram, b.facebook, b.tiktok, b.website].filter(Boolean).join(' · ') || '—')}</dd></div>
          <div><dt>Licensing</dt><dd>${esc(LICENSE_LABEL[b.license_status] || b.license_status)}</dd></div>
          <div><dt>Wants guidance</dt><dd>${b.wants_help ? 'Yes, would appreciate guidance' : 'No, handling it'}</dd></div>
          <div><dt>Independent</dt><dd>${b.independent_ok ? 'Confirmed owner-operated, not a franchise or chain' : 'Not confirmed'}</dd></div>
        </dl>
        ${field('notes', 'Internal notes', b.notes, { rows: 4, max: 8000, hint: 'For the review team only.' })}
      </div>
    </section>

    <section class="detail-sec">
      <h3>Public profile</h3>
      ${field('name', 'Business name', b.name, { max: 80 })}
      <div class="field-row">
        <div class="field"><label for="d-category">Category</label><select id="d-category" name="category">${Object.entries(CATEGORIES).map(([id, c]) => opt(id, c.label, b.category)).join('')}</select></div>
        <div class="field"><label for="d-kind">What they offer</label><select id="d-kind" name="kind">${KINDS.map((k) => opt(k.id, k.label, b.kind)).join('')}</select></div>
      </div>
      ${field('type_label', 'Short description line', b.type_label, { max: 80, hint: 'For example “Home bakery · Cottage Food”.' })}
      ${field('summary', 'One-sentence summary', b.summary, { max: 160 })}
      ${field('description', 'Description', b.description, { rows: 5, max: 1500 })}
      <div class="field-row">
        <div class="field"><label for="d-city">City</label><select id="d-city" name="city">${[...CITIES.filter((c) => c !== 'Other'), ...(CITIES.includes(b.city) ? [] : [b.city])].map((c) => opt(c, c, b.city)).join('')}</select></div>
        ${field('area', 'Service area (no home address)', b.area, { max: 160 })}
      </div>
      <div class="field-row">
        ${field('website', 'Website', b.website, { type: 'url' })}
        ${field('order_url', 'Order or booking link', b.order_url, { type: 'url' })}
      </div>
      <div class="field-row">
        ${field('instagram', 'Instagram', b.instagram)}
        ${field('facebook', 'Facebook', b.facebook)}
        ${field('tiktok', 'TikTok', b.tiktok)}
      </div>
      <div class="field-row">
        ${field('public_email', 'Public email', b.public_email, { type: 'email' })}
        ${field('public_phone', 'Public phone', b.public_phone, { type: 'tel' })}
      </div>
    </section>

    <section class="detail-sec">
      <h3>Stall on the street</h3>
      <div class="stall-editor">
        <div class="stall-preview" id="stall-preview" aria-hidden="true"></div>
        <div>
          <div class="field-row">
            <div class="field"><label for="d-display">Goods on display</label><select id="d-display" name="stall_display">${DISPLAYS.map((d) => opt(d, d, st.display)).join('')}</select></div>
            <div class="field"><label for="d-roof">Roof</label><select id="d-roof" name="stall_roof">${ROOFS.map((r) => opt(r, r, st.roof)).join('')}</select></div>
            <div class="field"><label for="d-valance">Awning edge</label><select id="d-valance" name="stall_valance">${VALANCES.map((v) => opt(v, v, st.valance)).join('')}</select></div>
          </div>
          <fieldset class="palette"><legend>Colors</legend>
            ${STALL_PALETTES.map((p, i) => `<label class="swatch"><input type="radio" name="stall_palette" value="${i}"${JSON.stringify(p).toLowerCase() === JSON.stringify(st.colors || []).toLowerCase() ? ' checked' : ''}><span style="background:linear-gradient(90deg,${p[0]} 0 33%,${p[1]} 33% 66%,${p[2]} 66%)"></span><span class="visually-hidden">Palette ${i + 1}</span></label>`).join('')}
          </fieldset>
          ${field('stall_chalk', 'Chalkboard words (optional)', st.chalk, { max: 24, hint: 'Two short words, for example “Fresh loaves”.' })}
        </div>
      </div>
    </section>

    <section class="detail-sec">
      <h3>Photos</h3>
      <ul class="admin-photos">${photos.map((p) => `<li><img src="${esc(A.photoUrl(p.url))}" alt="${esc(p.alt)}"><button type="button" class="link-button" data-photo="${esc(p.id)}">Remove</button></li>`).join('') || '<li class="hint">No photos yet.</li>'}</ul>
      <label class="btn btn-ghost file-btn">Add photos<input type="file" id="d-photos" accept="image/jpeg,image/png,image/webp" multiple></label>
    </section>

    <section class="detail-sec">
      <h3>Feature on the street</h3>
      <label class="check"><input type="checkbox" id="always-toggle"${(state.settings.always || []).includes(b.id) ? ' checked' : ''}> <span><strong>Always on the street</strong>: every day, in a different spot, on top of the daily rotation (up to 2 businesses).</span></label>
      <p class="hint">Or pin it for chosen days only (an event, an opening): it then stands on the street ahead of the rotation.</p>
      <ul class="pin-list">${pins.map((p, i) => `<li>${esc(p.from)} → ${esc(p.to)} <button type="button" class="link-button" data-unpin="${i}">Remove</button></li>`).join('') || '<li class="hint">Not pinned.</li>'}</ul>
      <div class="field-row field-row--end">
        <div class="field"><label for="pin-from">From</label><input type="date" id="pin-from" value="${todayInTemecula()}"></div>
        <div class="field"><label for="pin-to">To</label><input type="date" id="pin-to" value="${todayInTemecula()}"></div>
        <button type="button" class="btn btn-ghost" id="pin-add">Pin</button>
      </div>
    </section>

    <section class="detail-sec">
      <h3>History</h3>
      <ol class="history">${(history || []).map((h) => `<li><span class="num">${fmtDate(h.at)}</span> ${esc(h.action)} <span class="hint">${esc(h.detail || '')}</span></li>`).join('')}</ol>
    </section>

    <div class="detail-actions">
      <button type="submit" class="btn">Save changes</button>
      <span id="detail-status" role="status"></span>
      <span class="spacer"></span>
      <button type="button" class="link-button danger" id="detail-delete">Delete this business…</button>
    </div>
    <div class="confirm" id="delete-confirm" hidden>
      <p>Delete <strong>${esc(b.name)}</strong> and its photos permanently? This cannot be undone.</p>
      <button type="button" class="btn danger-btn" id="delete-yes">Delete permanently</button>
      <button type="button" class="btn btn-ghost" id="delete-no">Keep it</button>
    </div>
  </form>`;
  bindDetail();
  updatePreview();
}

function formPatch(form) {
  const f = new FormData(form);
  const patch = {};
  for (const k of ['status', 'notes', 'name', 'category', 'kind', 'type_label', 'summary', 'description', 'city', 'area', 'website', 'order_url', 'instagram', 'facebook', 'tiktok', 'public_email', 'public_phone']) patch[k] = f.get(k) || '';
  const pal = f.get('stall_palette');
  patch.stall = {
    display: f.get('stall_display'), roof: f.get('stall_roof'), valance: f.get('stall_valance'), chalk: f.get('stall_chalk') || '',
    ...(pal != null ? { colors: STALL_PALETTES[Number(pal)] } : {})
  };
  return patch;
}
function updatePreview() {
  const form = $('#detail-form');
  if (!form || !window.TH || !window.TH.renderStall) return;
  const p = formPatch(form);
  const b = state.current.business;
  const st = { ...(b.stall || {}), ...p.stall };
  $('#stall-preview').innerHTML = window.TH.renderChalet(forStall({ id: b.id, name: p.name || b.name, category: p.category, stall: st, isDemo: false }));
}
function bindDetail() {
  const form = $('#detail-form');
  const b = state.current.business;
  form.addEventListener('input', (e) => { if (/^(stall_|name|category)/.test(e.target.name)) updatePreview(); });
  form.addEventListener('change', (e) => { if (/^(stall_|category)/.test(e.target.name)) updatePreview(); });
  $('#detail-close').addEventListener('click', () => { $('#detail').hidden = true; state.current = null; renderList(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showFieldErrors(form, {});
    $('#detail-status').textContent = 'Saving…';
    try {
      await A.update(b.id, formPatch(form));
      $('#detail-status').textContent = '';
      toast(form.status.value === 'approved' ? 'Saved. This business is published.' : 'Saved.');
      await loadList();
      await openDetail(b.id);
    } catch (err) {
      $('#detail-status').textContent = err.message;
      if (err.fields) showFieldErrors(form, err.fields);
    }
  });
  $('#d-photos').addEventListener('change', async (e) => {
    const fd = new FormData();
    [...e.target.files].forEach((f) => fd.append('photos', f));
    await guard(() => A.addPhotos(b.id, fd));
    toast('Photos added.');
    openDetail(b.id);
  });
  $$('[data-photo]', form).forEach((btn) => btn.addEventListener('click', async () => {
    await guard(() => A.deletePhoto(b.id, btn.dataset.photo));
    toast('Photo removed.');
    openDetail(b.id);
  }));
  $('#always-toggle').addEventListener('change', async (e) => {
    const current = state.settings.always || [];
    if (e.target.checked && current.length >= 2) {
      e.target.checked = false;
      toast('Two businesses are already always on the street. Remove one first (Daily rotation tab).', true);
      return;
    }
    const always = e.target.checked ? [...current, b.id] : current.filter((id) => id !== b.id);
    state.settings = (await guard(() => A.saveSettings({ ...state.settings, always }))).settings;
    toast(e.target.checked ? (b.status === 'approved' ? 'Now on the street every day.' : 'Saved. It will be on the street every day once approved.') : 'Back in the normal rotation.');
  });
  $('#pin-add').addEventListener('click', async () => {
    const from = $('#pin-from').value, to = $('#pin-to').value;
    if (!from || !to || to < from) { toast('Choose a start date and an end date on or after it.', true); return; }
    const s = { ...state.settings, pins: [...(state.settings.pins || []), { id: b.id, from, to }] };
    state.settings = (await guard(() => A.saveSettings(s))).settings;
    toast(b.status === 'approved' ? 'Pinned.' : 'Pinned. It appears on the street once approved.');
    renderDetail();
  });
  $$('[data-unpin]', form).forEach((btn) => btn.addEventListener('click', async () => {
    const mine = (state.settings.pins || []).filter((p) => p.id === b.id);
    const target = mine[Number(btn.dataset.unpin)];
    const s = { ...state.settings, pins: state.settings.pins.filter((p) => p !== target) };
    state.settings = (await guard(() => A.saveSettings(s))).settings;
    renderDetail();
  }));
  $('#detail-delete').addEventListener('click', () => { $('#delete-confirm').hidden = false; $('#delete-no').focus(); });
  $('#delete-no').addEventListener('click', () => { $('#delete-confirm').hidden = true; });
  $('#delete-yes').addEventListener('click', async () => {
    await guard(() => A.remove(b.id));
    toast('Deleted.');
    $('#detail').hidden = true;
    state.current = null;
    loadList();
  });
}

/* ---------------- daily rotation ---------------- */
async function loadRotation() {
  const [{ settings }, preview] = await Promise.all([guard(() => A.settings()), guard(() => A.rotation(7))]);
  state.settings = settings;
  const form = $('#rotation-form');
  form.count.value = settings.count;
  form.count.max = MAX_FEATURED;
  form.newDays.value = settings.newDays;
  form.newMax.value = settings.newMax;
  $('#count-out').textContent = settings.count;
  const names = new Map();
  preview.days.forEach((d) => d.featured.forEach((f) => names.set(f.id, f.name)));
  $('#always-list').innerHTML = (settings.always || []).length
    ? settings.always.map((id) => `<li>${esc(names.get(id) || id)} <button type="button" class="link-button" data-always="${esc(id)}">Remove</button></li>`).join('')
    : '<li class="hint">None. Tick “Always on the street” on a business to add it.</li>';
  $('#pins').innerHTML = settings.pins.length
    ? settings.pins.map((p, i) => `<li>${esc(names.get(p.id) || p.id)} · ${esc(p.from)} → ${esc(p.to)} <button type="button" class="link-button" data-pin="${i}">Remove</button></li>`).join('')
    : '<li class="hint">No manual pins. Pin a business from its application.</li>';
  $('#approved-count').textContent = preview.approved;
  $('#rotation-preview').innerHTML = preview.days.map((d) => `
    <tr><th scope="row" class="num">${new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</th>
    <td>${d.featured.map((f) => `<span class="feat feat-${f.reason}" title="${f.reason}">${esc(f.name)}</span>`).join(' ') || '<span class="hint">No approved businesses yet.</span>'}</td></tr>`).join('');
}
$('#rotation-form').addEventListener('input', (e) => { if (e.target.name === 'count') $('#count-out').textContent = e.target.value; });
$('#rotation-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  state.settings = (await guard(() => A.saveSettings({ ...state.settings, count: f.count.value, newDays: f.newDays.value, newMax: f.newMax.value }))).settings;
  toast('Rotation saved.');
  loadRotation();
});
$('#reshuffle').addEventListener('click', async () => {
  state.settings = (await guard(() => A.saveSettings({ ...state.settings, seed: Math.random().toString(36).slice(2, 10) }))).settings;
  toast('New order saved. Fair rotation restarts from this order.');
  loadRotation();
});
$('#always-list').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-always]');
  if (!b) return;
  const always = (state.settings.always || []).filter((id) => id !== b.dataset.always);
  state.settings = (await guard(() => A.saveSettings({ ...state.settings, always }))).settings;
  loadRotation();
});
$('#pins').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-pin]');
  if (!b) return;
  const pins = state.settings.pins.filter((_, i) => i !== Number(b.dataset.pin));
  state.settings = (await guard(() => A.saveSettings({ ...state.settings, pins }))).settings;
  loadRotation();
});

/* ---------------- stories ---------------- */
async function loadStories() {
  const { stories } = await guard(() => A.stories());
  $('#story-list').innerHTML = stories.length ? stories.map((s) => `
    <article class="story-admin">
      <p class="card-kicker">${esc(s.status)} · ${fmtDate(s.created_at)}</p>
      <h3>${esc(s.title)}</h3>
      <p class="row-sub">${esc(s.author)}${s.business ? `, ${esc(s.business)}` : ''} · ${esc(s.contact)}</p>
      <p>${esc(s.body).slice(0, 600)}${s.body.length > 600 ? '…' : ''}</p>
      <p class="story-actions">
        ${s.status !== 'published' ? `<button type="button" class="btn" data-story="${esc(s.id)}" data-to="published">Publish</button>` : ''}
        ${s.status !== 'archived' ? `<button type="button" class="btn btn-ghost" data-story="${esc(s.id)}" data-to="archived">Archive</button>` : ''}
        ${s.status !== 'pending' ? `<button type="button" class="btn btn-ghost" data-story="${esc(s.id)}" data-to="pending">Back to pending</button>` : ''}
      </p>
    </article>`).join('') : '<p class="empty-state">No stories yet.</p>';
}
$('#story-list').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-story]');
  if (!b) return;
  await guard(() => A.updateStory(b.dataset.story, b.dataset.to));
  toast(b.dataset.to === 'published' ? 'Published on the Community page.' : 'Updated.');
  loadStories();
});

/* ---------------- start ---------------- */
if (A.signedIn()) showApp(); else showLogin();
