/* Business page: a shareable profile at business/?b=<slug>. */
import { api } from './api.js';
import { $, esc, root, bootChrome, profileHtml } from './ui.js';

bootChrome();
const slug = new URLSearchParams(location.search).get('b') || '';
const holder = $('#business');

(async () => {
  if (!slug) {
    holder.innerHTML = `<h1>Choose a business</h1><p>Browse the <a href="${root()}marketplace/">marketplace directory</a> to find local makers.</p>`;
    return;
  }
  try {
    const b = await api.business(slug);
    document.title = `${b.name} · Temecula Homegrown`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', `${b.name}: ${b.summary}`);
    holder.innerHTML = profileHtml(b, { titleTag: 'h1', withPageLink: false }) +
      `<p class="back-links"><a class="section-link" href="${root()}marketplace/">← Back to the marketplace</a></p>`;
  } catch (err) {
    holder.innerHTML = `<h1>This business is not listed</h1><p>${esc(err.message)} It may have been renamed or removed. Browse the <a href="${root()}marketplace/">marketplace directory</a>.</p>`;
  }
})();
