/*
 * MARKETPLACE — places stall components on the street's slots and handles
 * exploring: wheel, drag, touch, keyboard, step buttons, the street map and
 * the business profile.
 *
 * Placement rule (Phase 1): today's businesses fill the slots in order; the
 * remaining slots show an "open stall". In Phase 2 the ordered list comes from
 * the daily featured rotation.
 */
(function () {
  'use strict';
  const TH = window.TH;
  const $ = (s, el = document) => el.querySelector(s);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const behavior = () => (reduceMotion.matches ? 'auto' : 'smooth');

  const street = $('#street');
  const track = $('#track');
  const { W, H, STALL_W, STALL_H, STALL_BOTTOM, slots } = TH.STREET;

  TH.renderMountains($('#layer-mountains'));
  TH.renderHills($('#layer-hills'));
  TH.renderStreet($('#layer-architecture'), $('#layer-lights'), $('#layer-foreground'));

  /* ---------- place stalls ---------- */
  const businesses = TH.DEMO_BUSINESSES;
  const stallLayer = $('#layer-stalls');
  const placed = [];
  const list = $('#stall-list');

  slots.forEach((slot, i) => {
    const b = businesses[i];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'stall' + (b ? '' : ' stall--open');
    btn.style.left = ((slot.x - STALL_W / 2) / W) * 100 + '%';
    btn.style.top = ((STALL_BOTTOM - STALL_H) / H) * 100 + '%';
    btn.style.width = (STALL_W / W) * 100 + '%';
    btn.style.height = (STALL_H / H) * 100 + '%';
    if (b) {
      btn.innerHTML = TH.renderStall(b);
      btn.setAttribute('aria-label', `${b.name}, ${TH.CATEGORY[b.category].short}, ${b.type}. Demo listing. Open profile.`);
      btn.dataset.id = b.id;
      btn.addEventListener('click', () => openProfile(i));
      placed.push({ slot, b, el: btn, index: i });
      // accessible list alternative
      const li = document.createElement('li');
      li.innerHTML = `<button type="button" class="list-item"><span class="list-name">${b.name}</span><span class="chip chip--${b.category}">${TH.CATEGORY[b.category].short}</span><span class="list-type">${b.type}</span></button>`;
      li.querySelector('button').addEventListener('click', () => openProfile(i));
      list.appendChild(li);
    } else {
      btn.innerHTML = TH.renderEmptyStall();
      btn.setAttribute('aria-label', 'Open stall. Listings are free. Learn how to get listed.');
      btn.addEventListener('click', openFreeStall);
      placed.push({ slot, b: null, el: btn, index: i });
    }
    btn.addEventListener('focus', () => {
      const r = btn.getBoundingClientRect(), sr = street.getBoundingClientRect();
      if (r.left < sr.left + 40 || r.right > sr.right - 40) {
        street.scrollTo({ left: centerOf(slot) - street.clientWidth / 2, behavior: behavior() });
      }
    });
    stallLayer.appendChild(btn);
  });
  $('#stall-count').textContent = businesses.length;

  /* ---------- geometry ---------- */
  const scale = () => track.clientWidth / W;
  const centerOf = (slot) => slot.x * scale();

  /* ---------- parallax + map ---------- */
  const mtn = $('#layer-mountains'), hills = $('#layer-hills');
  const mapWin = $('#map-window');
  const nowName = $('#now-name');
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const x = street.scrollLeft;
      if (!reduceMotion.matches) {
        mtn.style.transform = `translate3d(${x * 0.72}px,0,0)`;
        hills.style.transform = `translate3d(${x * 0.45}px,0,0)`;
      } else {
        mtn.style.transform = hills.style.transform = '';
      }
      const tw = track.clientWidth;
      mapWin.style.left = (x / tw) * 100 + '%';
      mapWin.style.width = (street.clientWidth / tw) * 100 + '%';
      // nearest stall to the centre of the view
      const c = x + street.clientWidth / 2;
      let best = null, bd = Infinity;
      placed.forEach((p) => {
        const d = Math.abs(centerOf(p.slot) - c);
        if (d < bd) { bd = d; best = p; }
      });
      const atGate = c < centerOf(slots[0]) - 380 * scale();
      nowName.textContent = atGate ? 'The gateway arch' : best && best.b ? best.b.name : 'An open stall';
      document.body.classList.toggle('past-gate', x > Math.max(40, 750 * scale() - street.clientWidth / 2 + 40));
      ticking = false;
    });
  }
  street.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ---------- street map ---------- */
  const map = $('#map');
  placed.forEach((p) => {
    const dot = document.createElement('span');
    dot.className = 'map-dot' + (p.b ? ' map-dot--' + p.b.category : ' map-dot--open');
    dot.style.left = (p.slot.x / W) * 100 + '%';
    map.appendChild(dot);
  });
  const arch = document.createElement('span');
  arch.className = 'map-arch';
  arch.style.left = (750 / W) * 100 + '%';
  map.appendChild(arch);
  map.addEventListener('click', (e) => {
    const r = map.getBoundingClientRect();
    const f = (e.clientX - r.left) / r.width;
    street.scrollTo({ left: f * track.clientWidth - street.clientWidth / 2, behavior: behavior() });
  });

  /* ---------- step buttons ---------- */
  function step(dir) {
    const c = street.scrollLeft + street.clientWidth / 2;
    const centers = [750 * scale(), ...placed.map((p) => centerOf(p.slot))];
    let target;
    if (dir > 0) target = centers.find((x) => x > c + 12);
    else target = [...centers].reverse().find((x) => x < c - 12);
    if (target == null) return;
    street.scrollTo({ left: target - street.clientWidth / 2, behavior: behavior() });
  }
  $('#prev').addEventListener('click', () => step(-1));
  $('#next').addEventListener('click', () => step(1));
  $('#enter').addEventListener('click', () => step(1));

  /* ---------- keyboard on the street region ---------- */
  street.addEventListener('keydown', (e) => {
    if (e.target !== street) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === 'Home') { e.preventDefault(); street.scrollTo({ left: 0, behavior: behavior() }); }
    if (e.key === 'End') { e.preventDefault(); street.scrollTo({ left: track.clientWidth, behavior: behavior() }); }
  });

  /* ---------- mouse wheel scrolls sideways (desktop) ---------- */
  street.addEventListener('wheel', (e) => {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const max = street.scrollWidth - street.clientWidth;
    const atStart = street.scrollLeft <= 0 && e.deltaY < 0;
    const atEnd = street.scrollLeft >= max - 1 && e.deltaY > 0;
    if (atStart || atEnd) return; // let the page scroll at the ends
    e.preventDefault();
    street.scrollLeft += e.deltaY * (e.deltaMode === 1 ? 32 : 1);
  }, { passive: false });

  /* ---------- drag to pan (mouse only; touch scrolls natively) ---------- */
  let drag = null, suppressClick = false;
  street.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: street.scrollLeft, moved: false, id: e.pointerId };
  });
  street.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) {
      drag.moved = true;
      street.setPointerCapture(drag.id);
      street.classList.add('dragging');
    }
    if (drag.moved) street.scrollLeft = drag.left - dx;
  });
  const endDrag = () => {
    if (drag && drag.moved) { suppressClick = true; setTimeout(() => (suppressClick = false), 0); }
    drag = null;
    street.classList.remove('dragging');
  };
  street.addEventListener('pointerup', endDrag);
  street.addEventListener('pointercancel', endDrag);
  street.addEventListener('click', (e) => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); } }, true);

  /* ---------- profile dialog ---------- */
  const dlg = $('#profile');
  let current = -1;
  const LINK_LABELS = { website: 'Website', instagram: 'Instagram', facebook: 'Facebook', email: 'Email' };

  function openProfile(i) {
    current = i;
    const b = businesses[i];
    const cat = TH.CATEGORY[b.category];
    const links = Object.keys(LINK_LABELS).filter((k) => b.links[k]);
    $('#profile-body').innerHTML = `
      <p class="demo-banner">Demo listing. This business is not real; it shows how a profile will look.</p>
      <div class="profile-head">
        <span class="chip chip--${b.category}">${cat.label}</span>
        <h2 id="profile-title">${b.name}</h2>
        <p class="profile-type">${b.type}</p>
      </div>
      <p class="profile-summary">${b.summary}</p>
      <p>${b.description}</p>
      <div class="photos" role="list" aria-label="Photo placeholders">
        ${[0, 1, 2].map((k) => `<figure role="listitem" class="photo photo--${k}">${TH.renderGoodsVignette(b)}<figcaption>Business photo ${k + 1} goes here</figcaption></figure>`).join('')}
      </div>
      <dl class="facts">
        <div><dt>Location / service area</dt><dd>${b.area}</dd></div>
        <div><dt>Address</dt><dd>Home addresses are never published</dd></div>
      </dl>
      <div class="links">
        ${links.map((k) => `<span class="link-pill" aria-disabled="true">${LINK_LABELS[k]}<small>demo</small></span>`).join('')}
      </div>
      <p class="profile-note">On the live site these buttons go straight to the business's own website, ordering page or social accounts. Temecula Homegrown never takes orders or payments.</p>`;
    dlg.classList.remove('dialog--open-stall');
    dlg.setAttribute('aria-labelledby', 'profile-title');
    $('#profile-nav').hidden = false;
    $('#profile-pos').textContent = `${i + 1} of ${businesses.length}`;
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
    $('.dialog-inner').scrollTop = 0;
  }

  function openFreeStall() {
    current = -1;
    $('#profile-body').innerHTML = `
      <div class="profile-head">
        <span class="chip chip--open">Open stall</span>
        <h2 id="profile-title">This stall is waiting for a local business</h2>
      </div>
      <p class="profile-summary">Listings on Temecula Homegrown are free. No subscriptions, commissions or paid rankings.</p>
      <p>Two kinds of businesses will be able to apply:</p>
      <ul class="cats">
        <li><span class="chip chip--home">Home-Based Business</span> Home bakeries and Cottage Food, handmade goods, candles and soaps, jewelry, crafts, personalized gifts, small producers and home-based services.</li>
        <li><span class="chip chip--micro">Independent Micro-Business</span> Independent artisans, small workshops and studios, makers, appointment-based and pop-up businesses, and owner-operated services without a retail storefront.</li>
      </ul>
      <p class="profile-note">The application form arrives in Phase 2.</p>`;
    dlg.classList.add('dialog--open-stall');
    $('#profile-nav').hidden = true;
    if (!dlg.open) dlg.showModal();
  }

  $('#profile-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  $('#profile-prev').addEventListener('click', () => openProfile((current - 1 + businesses.length) % businesses.length));
  $('#profile-next').addEventListener('click', () => openProfile((current + 1) % businesses.length));
  dlg.addEventListener('close', () => {
    if (current >= 0) {
      const p = placed[current];
      street.scrollTo({ left: centerOf(p.slot) - street.clientWidth / 2, behavior: behavior() });
      p.el.focus({ preventScroll: true });
    }
  });

  /* ---------- paper grain over the illustration (generated, tiny) ---------- */
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 120;
    const g = c.getContext('2d');
    const img = g.createImageData(120, 120);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 200 + Math.random() * 55;
      img.data[i] = v; img.data[i + 1] = v * 0.97; img.data[i + 2] = v * 0.92; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    $('#layer-grain').style.backgroundImage = `url(${c.toDataURL()})`;
  } catch (e) { /* texture is optional */ }

  /* ---------- Daytime / Evening switch ---------- */
  const market = $('.market');
  function setScene(scene) {
    market.dataset.scene = scene;
    document.querySelectorAll('.scene-switch button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scene === scene)));
  }
  // Default follows the visitor's local clock: evening from 8 pm until 6 am.
  // A manual choice is kept for the rest of the visit (this browser tab).
  const hour = new Date().getHours();
  let scene = hour >= 20 || hour < 6 ? 'evening' : 'day';
  try {
    const saved = sessionStorage.getItem('th-scene');
    if (saved === 'evening' || saved === 'day') scene = saved;
  } catch (e) { /* keep the clock-based default */ }
  setScene(scene);
  document.querySelectorAll('.scene-switch button').forEach((b) => b.addEventListener('click', () => {
    setScene(b.dataset.scene);
    try { sessionStorage.setItem('th-scene', b.dataset.scene); } catch (e) { /* optional */ }
  }));

  /* ---------- date line ---------- */
  try {
    $('#today').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  } catch (e) { /* keep the static fallback */ }

  // phones: open with the arch centred instead of its left pillar
  if (street.clientWidth < 1500 * scale()) street.scrollLeft = 750 * scale() - street.clientWidth / 2;
  onScroll();
})();
