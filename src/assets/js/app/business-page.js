/*
 * Business page. Each approved business has a pre-built page at business/<slug>/
 * (made at build time for search engines). This script refreshes it with the
 * latest data and adds the full-size photo viewer. It also serves the older
 * business/?b=<slug> links and businesses approved since the last nightly build
 * (through the 404 page).
 */
import { api } from './api.js';
import { $, esc, root, bootChrome, profileHtml } from './ui.js';

bootChrome();
const holder = $('#business');
const slug = holder.dataset.slug || new URLSearchParams(location.search).get('b') || '';
const prebuilt = Boolean(holder.querySelector('#profile-title'));
const home = root() || '/';

(async () => {
  if (!slug) {
    holder.innerHTML = `<h1>Choose a business</h1><p>Browse the <a href="${home}marketplace/">marketplace directory</a> to find local makers.</p>`;
    return;
  }
  try {
    const b = await api.business(slug);
    document.title = `${b.name} · ${b.type} in ${b.city}, CA · Front Street Makers`;
    if (!prebuilt) {
      const desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute('content', `${b.name}: ${b.summary}`);
    }
    holder.innerHTML = profileHtml(b, { titleTag: 'h1', withPageLink: false }) +
      `<p class="back-links"><a class="section-link" href="${home}marketplace/">← More local makers in the marketplace</a></p>`;
  } catch (err) {
    if (prebuilt) return; // keep the pre-built page if the live data can't be reached
    holder.innerHTML = `<h1>This business is not listed</h1><p>${esc(err.message)} It may have been renamed or removed. Browse the <a href="${home}marketplace/">marketplace directory</a>.</p>`;
  }
})();
