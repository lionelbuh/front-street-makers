/* Shared UI pieces: escaping, profile rendering, directory cards, page chrome. */
import { CATEGORIES, KIND_BY_ID } from './catalog.js';
import { DEMO_MODE } from './config.js';
import { dayNumber, todayInTemecula } from './rotation.js';

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const root = () => document.documentElement.dataset.root || '';
export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
/** Only ever put http(s), mailto or tel links into href attributes. */
export function safeHref(url) {
  const s = String(url || '');
  return /^(https?:|mailto:|tel:)/i.test(s) ? esc(s) : '#';
}
export const businessHref = (b) => `${root()}business/?b=${encodeURIComponent(b.slug)}`;

export function isNew(b, days = 30) {
  if (!b.publishedAt) return false;
  const age = dayNumber(todayInTemecula()) - dayNumber(String(b.publishedAt).slice(0, 10));
  return age >= 0 && age < days;
}

/* ---------------- profile ---------------- */
const LINKS = [
  ['website', 'Website'], ['order', 'Order online'], ['instagram', 'Instagram'], ['facebook', 'Facebook'],
  ['tiktok', 'TikTok'], ['email', 'Email'], ['phone', 'Call']
];
function linkHref(kind, v) {
  if (kind === 'email') return `mailto:${v}`;
  if (kind === 'phone') return `tel:${String(v).replace(/[^0-9+]/g, '')}`;
  return v;
}

export function profileHtml(b, { titleTag = 'h2', withPageLink = true } = {}) {
  const cat = CATEGORIES[b.category] || { label: '' };
  const links = LINKS.filter(([k]) => b.links && b.links[k]);
  const photos = b.photos || [];
  let photosHtml = '';
  if (photos.length) {
    photosHtml = `<div class="photos photos--${Math.min(photos.length, 3)}" role="list" aria-label="Photos from ${esc(b.name)}">
      ${photos.slice(0, 6).map((p, i) => `<figure role="listitem" class="photo photo--${i}"><img src="${safeHref(p.url)}" alt="${esc(p.alt || b.name)}" loading="lazy" decoding="async"></figure>`).join('')}
    </div>`;
  } else if (b.isDemo && window.TH && window.TH.renderGoodsVignette) {
    const st = b.stall || {};
    const flat = { ...b, display: st.display, colors: st.colors };
    photosHtml = `<div class="photos" role="list" aria-label="Photo placeholders">
      ${[0, 1, 2].map((k) => `<figure role="listitem" class="photo photo--placeholder photo--${k}">${window.TH.renderGoodsVignette(flat)}<figcaption>Business photo ${k + 1} goes here</figcaption></figure>`).join('')}
    </div>`;
  }
  const linkHtml = links.map(([k, label]) => b.isDemo
    ? `<span class="link-pill" aria-disabled="true">${label}<small>demo</small></span>`
    : `<a class="link-pill" href="${safeHref(linkHref(k, b.links[k]))}"${k === 'email' || k === 'phone' ? '' : ' target="_blank" rel="noopener"'}>${label}</a>`).join('');
  return `
    ${b.isDemo ? '<p class="demo-banner">Demo listing. This business is not real; it shows how a profile looks.</p>' : ''}
    <div class="profile-head">
      <span class="chip chip--${esc(b.category)}">${esc(cat.label)}</span>
      <${titleTag} id="profile-title">${esc(b.name)}</${titleTag}>
      <p class="profile-type">${esc(b.type)}${isNew(b) ? ' <span class="badge-new">New</span>' : ''}</p>
    </div>
    <p class="profile-summary">${esc(b.summary)}</p>
    ${b.description ? `<div class="profile-description">${esc(b.description).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')}</div>` : ''}
    ${photosHtml}
    <dl class="facts">
      <div><dt>Where</dt><dd>${esc(b.area || b.city)}</dd></div>
      <div><dt>What they offer</dt><dd>${esc((KIND_BY_ID[b.kind] || {}).label || b.type)}</dd></div>
    </dl>
    ${linkHtml ? `<div class="links">${linkHtml}</div>` : ''}
    <p class="profile-note">Contact the business directly to order or book. Front Street Makers never takes orders or payments, and home addresses are never published.</p>
    ${withPageLink && !b.isDemo ? `<p><a class="section-link" href="${businessHref(b)}">Open this business's page</a></p>` : ''}`;
}

/* ---------------- profile dialog (shared by street and directory) ---------------- */
let dialogList = [];
let dialogIndex = -1;
let onClose = null;

export function setupProfileDialog({ onClosed } = {}) {
  const dlg = $('#profile');
  if (!dlg) return;
  onClose = onClosed || null;
  $('#profile-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  $('#profile-prev').addEventListener('click', () => openProfile(dialogList[(dialogIndex - 1 + dialogList.length) % dialogList.length], dialogList));
  $('#profile-next').addEventListener('click', () => openProfile(dialogList[(dialogIndex + 1) % dialogList.length], dialogList));
  dlg.addEventListener('close', () => { if (onClose && dialogIndex >= 0) onClose(dialogList[dialogIndex]); });
}

export function openProfile(b, list = [b]) {
  const dlg = $('#profile');
  dialogList = list;
  dialogIndex = list.indexOf(b);
  $('#profile-body').innerHTML = profileHtml(b);
  dlg.setAttribute('aria-labelledby', 'profile-title');
  $('#profile-nav').hidden = list.length < 2;
  $('#profile-pos').textContent = `${dialogIndex + 1} of ${list.length}`;
  if (!dlg.open) dlg.showModal();
  $('.dialog-inner', dlg).scrollTop = 0;
}

export function openFreeStall() {
  const dlg = $('#profile');
  dialogIndex = -1;
  $('#profile-body').innerHTML = `
    <div class="profile-head">
      <span class="chip chip--open">Open stall</span>
      <h2 id="profile-title">This stall is waiting for a local business</h2>
    </div>
    <p class="profile-summary">Listings on Front Street Makers are free. No subscriptions, commissions or paid rankings.</p>
    <ul class="cats">
      <li><span class="chip chip--home">${CATEGORIES.home.label}</span> ${esc(CATEGORIES.home.blurb)}</li>
      <li><span class="chip chip--micro">${CATEGORIES.micro.label}</span> ${esc(CATEGORIES.micro.blurb)}</li>
    </ul>
    <p><a class="btn" href="${root()}get-listed/">Apply for a free listing</a></p>`;
  $('#profile-nav').hidden = true;
  if (!dlg.open) dlg.showModal();
}

/* ---------------- directory card ---------------- */
export function cardHtml(b, { featured = false } = {}) {
  const cat = CATEGORIES[b.category] || { short: '' };
  const thumb = b.photos && b.photos[0] ? `<img class="biz-thumb" src="${safeHref(b.photos[0].url)}" alt="" loading="lazy" decoding="async">` : '';
  return `<article class="biz-card${thumb ? ' biz-card--photo' : ''}">
    ${thumb}
    <div class="biz-body">
      <p class="card-kicker">${esc(cat.short)} · ${esc(b.city)}</p>
      <h3 class="biz-name"><button type="button" class="biz-open" data-id="${esc(b.id)}">${esc(b.name)}</button></h3>
      <p class="biz-type">${esc(b.type)}</p>
      <p class="biz-summary">${esc(b.summary)}</p>
      <p class="biz-badges">${featured ? '<span class="badge-street">On the street today</span>' : ''}${isNew(b) ? '<span class="badge-new">New</span>' : ''}${b.isDemo ? '<span class="badge-demo">Demo</span>' : ''}</p>
    </div>
  </article>`;
}

/* ---------------- page chrome ---------------- */
export function bootChrome() {
  try {
    const label = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles' });
    $$('#today, .js-today').forEach((el) => (el.textContent = label));
  } catch { /* keep static */ }
  // mobile menu
  const toggle = $('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('nav-open', open);
    });
  }
  if (DEMO_MODE) {
    const bar = document.createElement('p');
    bar.className = 'demo-mode-bar';
    bar.innerHTML = '<strong>Demo mode.</strong> Sample businesses only; forms and the admin dashboard keep everything in this browser until the live service is connected.';
    document.body.prepend(bar);
  }
}

export function showFieldErrors(form, fields) {
  $$('.field-error', form).forEach((n) => n.remove());
  $$('[aria-invalid="true"]', form).forEach((n) => n.removeAttribute('aria-invalid'));
  let first = null;
  for (const [name, message] of Object.entries(fields || {})) {
    const input = form.querySelector(`[name="${name}"]`);
    const holder = input ? input.closest('.field, fieldset') || input.parentElement : null;
    if (!holder) continue;
    const p = document.createElement('p');
    p.className = 'field-error';
    p.id = `err-${name}`;
    p.textContent = message;
    holder.appendChild(p);
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', p.id);
      first = first || input;
    }
  }
  if (first) first.focus();
}
