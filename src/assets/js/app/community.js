/* Community: published entrepreneur stories and the "share your story" form. */
import { api, ApiError } from './api.js';
import { DEMO_MODE } from './config.js';
import { $, esc, bootChrome, showFieldErrors } from './ui.js';

bootChrome();

(async () => {
  const list = $('#stories');
  try {
    const stories = await api.stories();
    list.innerHTML = stories.length
      ? stories.map((s) => `<article class="story">
          <p class="card-kicker">${esc(s.business || 'Local entrepreneur')}</p>
          <h3>${esc(s.title)}</h3>
          <div class="story-body">${esc(s.body).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')}</div>
          <p class="story-by">By ${esc(s.author)} · ${new Date(s.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </article>`).join('')
      : `<p class="empty-state">The first stories are being written. If you run a small business in the valley, yours could be one of them: use the form below.</p>`;
  } catch (err) {
    list.innerHTML = `<p class="empty-state">${esc(err.message)}</p>`;
  }
})();

const form = $('#story-form');
form.started_at.value = String(Date.now());
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showFieldErrors(form, {});
  const status = $('#story-status');
  status.textContent = 'Sending…';
  try {
    await api.submitStory(new FormData(form));
    form.reset();
    status.textContent = DEMO_MODE
      ? 'Thank you. Demo mode: your story is saved in this browser; publish it from the admin dashboard (password: demo).'
      : 'Thank you. We read every story and will contact you before anything is published.';
  } catch (err) {
    status.textContent = err.message;
    if (err instanceof ApiError && err.fields) showFieldErrors(form, err.fields);
  }
});
