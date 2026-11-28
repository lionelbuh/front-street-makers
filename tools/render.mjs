// Server-side (build-time) HTML for businesses, so search engines and link
// previews see real content. Same CSS classes as the browser rendering.
import { CATEGORIES, KIND_BY_ID } from '../src/assets/js/app/catalog.js';

export const SITE = 'https://frontstreetmakers.com';

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const safeUrl = (u) => (/^(https?:|mailto:|tel:)/i.test(String(u || '')) ? esc(u) : '#');
export const businessPath = (b) => `business/${b.slug}/`;

const LINKS = [['website', 'Website'], ['order', 'Order online'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['email', 'Email'], ['phone', 'Call']];
const linkHref = (k, v) => (k === 'email' ? `mailto:${v}` : k === 'phone' ? `tel:${String(v).replace(/[^0-9+]/g, '')}` : v);

// Search results show about 60 characters of a title and 155 of a description.
const clip = (str, max) => (str.length <= max ? str : str.slice(0, str.lastIndexOf(' ', max - 1)).replace(/[\s,.;:·-]+$/, '') + '…');
export function businessTitle(b) {
  const what = String(b.type || (KIND_BY_ID[b.kind] || {}).label || 'Local maker').split(' · ')[0];
  const full = `${b.name} · ${what} in ${b.city}, CA`;
  return full.length <= 60 ? full : clip(`${b.name} · ${b.city}, CA`, 60);
}
export function businessDescription(b) {
  return clip(`${b.summary} ${b.name} is a local ${(CATEGORIES[b.category] || {}).short?.toLowerCase() || ''} business in ${b.city}, listed free on Front Street Makers.`.replace(/\s+/g, ' ').trim(), 155);
}

export function staticProfile(b, root) {
  const cat = CATEGORIES[b.category] || { label: '' };
  const photos = (b.photos || []).slice(0, 6);
  const links = LINKS.filter(([k]) => b.links && b.links[k]);
  return `
    <div class="profile-head">
      <span class="chip chip--${esc(b.category)}">${esc(cat.label)}</span>
      <h1 id="profile-title">${esc(b.name)}</h1>
      <p class="profile-type">${esc(b.type)} · ${esc(b.city)}, California</p>
    </div>
    <p class="profile-summary">${esc(b.summary)}</p>
    ${b.description ? `<div class="profile-description">${esc(b.description).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')}</div>` : ''}
    ${photos.length ? `<div class="photos photos--${Math.min(photos.length, 3)}${photos.length > 3 ? ' photos--many' : ''}" role="list" aria-label="Photos from ${esc(b.name)}">
      ${photos.map((p, i) => `<figure role="listitem" class="photo photo--${i}"><img src="${safeUrl(p.url)}" alt="${esc(p.alt || b.name)}" loading="${i ? 'lazy' : 'eager'}" decoding="async"></figure>`).join('')}
    </div>` : ''}
    <dl class="facts">
      <div><dt>Where</dt><dd>${esc(b.area || b.city)}</dd></div>
      <div><dt>What they offer</dt><dd>${esc((KIND_BY_ID[b.kind] || {}).label || b.type)}</dd></div>
    </dl>
    ${links.length ? `<div class="links">${links.map(([k, label]) => `<a class="link-pill" href="${safeUrl(linkHref(k, b.links[k]))}"${k === 'email' || k === 'phone' ? '' : ' target="_blank" rel="noopener"'}>${label}</a>`).join('')}</div>` : ''}
    <p class="profile-note">Contact the business directly to order or book. Front Street Makers never takes orders or payments, and home addresses are never published.</p>
    <p class="back-links"><a class="section-link" href="${root}marketplace/">← More local makers in the marketplace</a></p>`;
}

export function businessJsonLd(b) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE}/${businessPath(b)}#business`,
    name: b.name,
    description: b.summary,
    url: `${SITE}/${businessPath(b)}`,
    areaServed: { '@type': 'City', name: b.city, containedInPlace: { '@type': 'State', name: 'California' } },
    ...(b.photos && b.photos.length ? { image: b.photos.map((p) => p.url) } : {}),
    ...(b.links.email ? { email: b.links.email } : {}),
    ...(b.links.phone ? { telephone: b.links.phone } : {}),
    sameAs: [b.links.website, b.links.instagram, b.links.facebook, b.links.tiktok].filter(Boolean)
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

export function staticCard(b, root) {
  const cat = CATEGORIES[b.category] || { short: '' };
  const thumb = b.photos && b.photos[0] ? `<img class="biz-thumb" src="${safeUrl(b.photos[0].url)}" alt="" loading="lazy" decoding="async">` : '';
  return `<article class="biz-card${thumb ? ' biz-card--photo' : ''}">
    ${thumb}
    <div class="biz-body">
      <p class="card-kicker">${esc(cat.short)} · ${esc(b.city)}</p>
      <h3 class="biz-name"><a href="${root}${businessPath(b)}">${esc(b.name)}</a></h3>
      <p class="biz-type">${esc(b.type)}</p>
      <p class="biz-summary">${esc(b.summary)}</p>
    </div>
  </article>`;
}

export function directoryJsonLd(businesses) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Local makers and home-based businesses in Temecula and Murrieta',
    itemListElement: businesses.map((b, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/${businessPath(b)}`, name: b.name }))
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}
