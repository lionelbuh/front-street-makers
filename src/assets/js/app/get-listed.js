/* Get Listed: the free application form. */
import { api, ApiError } from './api.js';
import { CONFIG, DEMO_MODE } from './config.js';
import { KINDS, CITIES, LICENSE_OPTIONS } from './catalog.js';
import { $, $$, esc, root, bootChrome, showFieldErrors } from './ui.js';

bootChrome();

const form = $('#apply-form');
const MAX_PHOTOS = 6;

// fill the choice lists from the shared catalog
$('#kind').insertAdjacentHTML('beforeend', KINDS.map((k) => `<option value="${k.id}">${esc(k.label)}</option>`).join(''));
$('#city').insertAdjacentHTML('beforeend', CITIES.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join(''));
$('#license-options').innerHTML = LICENSE_OPTIONS.map((o) => `
  <label class="choice"><input type="radio" name="license_status" value="${o.id}" required> <span>${esc(o.label)}</span></label>`).join('');
form.started_at.value = String(Date.now());

// Turnstile (optional)
if (CONFIG.TURNSTILE_SITE_KEY && !DEMO_MODE) {
  const holder = $('#turnstile');
  holder.hidden = false;
  holder.innerHTML = `<div class="cf-turnstile" data-sitekey="${esc(CONFIG.TURNSTILE_SITE_KEY)}"></div>`;
  const s = document.createElement('script');
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
  s.async = true;
  document.head.appendChild(s);
}

// licensing answer → guidance
function updateGuidance() {
  const v = (form.querySelector('input[name="license_status"]:checked') || {}).value;
  const box = $('#license-guidance');
  if (!v) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = v === 'ready' || v === 'not_required'
    ? `<p><strong>Thank you.</strong> You stay responsible for the rules that apply to your activity. If anything changes, the <a href="${root()}startup-corner/">Startup Corner</a> lists the official city, county and state resources.</p>`
    : `<p><strong>No problem: you can still apply.</strong> We review applications like yours with you before publishing, so your listing goes live once your situation is clear. In the meantime, the <a href="${root()}startup-corner/" target="_blank">Startup Corner</a> explains business licenses, home-based business rules and California Cottage Food, with links to the official offices.</p>`;
}
form.addEventListener('change', (e) => { if (e.target.name === 'license_status') updateGuidance(); });

// character counters
$$('[data-max]', form).forEach((el) => {
  const out = document.createElement('span');
  out.className = 'counter';
  out.setAttribute('aria-hidden', 'true');
  el.after(out);
  const upd = () => (out.textContent = `${el.value.length} / ${el.dataset.max}`);
  el.addEventListener('input', upd);
  upd();
});

// photos: preview and resize before upload
let photos = [];
const photoInput = $('#photos');
const previews = $('#photo-previews');
function renderPreviews() {
  previews.innerHTML = photos.map((p, i) => `<li><img src="${p.preview}" alt=""><button type="button" data-i="${i}" aria-label="Remove photo ${i + 1}">Remove</button></li>`).join('');
  $('#photo-count').textContent = photos.length ? `${photos.length} of ${MAX_PHOTOS} photos` : '';
}
async function resize(file, max = 1600, quality = 0.85) {
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}
photoInput.addEventListener('change', async () => {
  const picked = [...photoInput.files].filter((f) => /^image\/(jpeg|png|webp|heic|heif)$/.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name));
  for (const f of picked) {
    if (photos.length >= MAX_PHOTOS) break;
    try {
      const small = await resize(f);
      photos.push({ file: small, preview: URL.createObjectURL(small) });
    } catch {
      showFieldErrors(form, { photos: `We could not read “${f.name}”. Please use a JPEG or PNG photo.` });
    }
  }
  photoInput.value = '';
  renderPreviews();
});
previews.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-i]');
  if (!b) return;
  URL.revokeObjectURL(photos[Number(b.dataset.i)].preview);
  photos.splice(Number(b.dataset.i), 1);
  renderPreviews();
});

// submit
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = $('#form-status');
  const submit = $('#apply-submit');
  showFieldErrors(form, {});
  if (!form.checkValidity()) {
    const bad = form.querySelector(':invalid');
    const fields = {};
    $$(':invalid', form).forEach((el) => { if (el.name && !fields[el.name]) fields[el.name] = el.validationMessage || 'Please answer this question.'; });
    showFieldErrors(form, fields);
    if (bad) bad.focus();
    return;
  }
  const data = new FormData(form);
  data.delete('photos');
  photos.forEach((p) => data.append('photos', p.file));
  submit.disabled = true;
  status.textContent = 'Sending your application…';
  try {
    const out = await api.apply(data);
    showDone(out, data.get('name'));
  } catch (err) {
    submit.disabled = false;
    status.textContent = err.message;
    if (err instanceof ApiError && err.fields) showFieldErrors(form, err.fields);
  }
});

function showDone(out, name) {
  form.hidden = true;
  const done = $('#apply-done');
  done.hidden = false;
  done.innerHTML = `
    <p class="kicker">Application received</p>
    <h2>Thank you, ${esc(name)} is on its way to the street.</h2>
    ${out.needsGuidance
      ? `<p class="lead">You told us your licensing is not settled yet. That is common for new businesses. We will contact you to go through it together, and your listing will be published once the requirements are clear.</p>
         <p>Start with the <a href="${root()}startup-corner/">Startup Corner</a>: it explains city business licenses, home-based business rules and California Cottage Food, with links to the official offices.</p>`
      : `<p class="lead">We review every application by hand. You will hear from us by email, usually within a few days. Approved businesses appear in the directory and take turns on the illustrated street.</p>`}
    ${DEMO_MODE ? `<p class="demo-note">Demo mode: your application was saved in this browser only. Open the <a href="${root()}admin/">admin dashboard</a> (password: demo) to review and approve it, then visit the marketplace to see your stall.</p>` : ''}
    <p><a class="btn btn-ghost" href="${root()}marketplace/">Back to the marketplace</a></p>`;
  done.focus();
  window.scrollTo({ top: done.getBoundingClientRect().top + window.scrollY - 20 });
}
