/*
 * STREET — mounts the illustrated street and places today's stalls.
 *
 *   TH.mountStreet({ businesses, plan, onOpen, onOpenFree })
 *     businesses  today's featured businesses, in order
 *     plan        array (one per slot): index into `businesses`, or null for an open stall
 *     onOpen(b)   called when a business stall is chosen
 *     onOpenFree  called when an open stall is chosen
 *
 * Handles exploring: wheel, drag, touch, keyboard, step buttons, the street
 * map, "Now passing" and the Daytime / Evening switch. Knows nothing about
 * where the data comes from.
 */
(function () {
  'use strict';
  const TH = (window.TH = window.TH || {});
  const $ = (s, el = document) => el.querySelector(s);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const behavior = () => (reduceMotion.matches ? 'auto' : 'smooth');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CATEGORY_SHORT = { home: 'Home-based', micro: 'Micro-business' };

  TH.mountStreet = function mountStreet({ businesses = [], plan = [], onOpen = () => {}, onOpenFree = () => {} } = {}) {
    const street = $('#street');
    const track = $('#track');
    if (!street || !track) return null;
    const { W, H, slots } = TH.STREET;

    TH.renderMountains($('#layer-mountains'));
    TH.renderHills($('#layer-hills'));
    TH.renderStreet($('#layer-architecture'), $('#layer-lights'), $('#layer-foreground'));

    /* ---------- stalls ---------- */
    const stallLayer = $('#layer-stalls');
    stallLayer.innerHTML = '';
    const placed = [];
    slots.forEach((slot, i) => {
      const bi = plan[i];
      const b = bi == null ? null : businesses[bi];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'stall stall--' + slot.row + (b ? '' : ' stall--open');
      btn.style.left = ((slot.x - slot.w / 2) / W) * 100 + '%';
      btn.style.top = ((slot.bottom - slot.h) / H) * 100 + '%';
      btn.style.width = (slot.w / W) * 100 + '%';
      btn.style.height = (slot.h / H) * 100 + '%';
      if (b) {
        btn.innerHTML = TH.renderChalet(b);
        btn.setAttribute('aria-label', `${b.name}, ${CATEGORY_SHORT[b.category] || ''}, ${b.type}.${b.isDemo ? ' Demo listing.' : ''} Open profile.`);
        btn.dataset.id = b.id;
        btn.addEventListener('click', () => onOpen(b));
      } else {
        btn.innerHTML = TH.renderEmptyChalet();
        btn.setAttribute('aria-label', 'Open chalet. Listings are free. Learn how to get listed.');
        btn.addEventListener('click', () => onOpenFree());
      }
      placed.push({ slot, b, el: btn, index: i });
      btn.addEventListener('focus', () => {
        const r = btn.getBoundingClientRect(), sr = street.getBoundingClientRect();
        if (r.left < sr.left + 40 || r.right > sr.right - 40) {
          street.scrollTo({ left: centerOf(slot) - street.clientWidth / 2, behavior: behavior() });
        }
      });
      stallLayer.appendChild(btn);
    });

    /* ---------- geometry ---------- */
    const scale = () => track.clientWidth / W;
    const centerOf = (slot) => slot.x * scale();

    /* ---------- parallax, map, now passing ---------- */
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
        if (mapWin) {
          mapWin.style.left = (x / tw) * 100 + '%';
          mapWin.style.width = (street.clientWidth / tw) * 100 + '%';
        }
        const c = x + street.clientWidth / 2;
        let best = null, bd = Infinity;
        placed.forEach((p) => {
          const d = Math.abs(centerOf(p.slot) - c);
          if (d < bd) { bd = d; best = p; }
        });
        if (nowName && !document.body.classList.contains('at-arch')) nowName.textContent = best && best.b ? best.b.name : 'An open chalet';
        ticking = false;
      });
    }
    street.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    const map = $('#map');
    if (map) {
      map.querySelectorAll('.map-dot, .map-arch').forEach((n) => n.remove());
      placed.forEach((p) => {
        const dot = document.createElement('span');
        dot.className = 'map-dot' + (p.b ? ' map-dot--' + p.b.category : ' map-dot--open');
        dot.style.left = (p.slot.x / W) * 100 + '%';
        map.appendChild(dot);
      });
      map.addEventListener('click', (e) => {
        const r = map.getBoundingClientRect();
        const f = (e.clientX - r.left) / r.width;
        street.scrollTo({ left: f * track.clientWidth - street.clientWidth / 2, behavior: behavior() });
      });
    }

    /* ---------- step buttons and keyboard ---------- */
    function step(dir) {
      const c = street.scrollLeft + street.clientWidth / 2;
      const centers = placed.map((p) => centerOf(p.slot)).sort((a, b) => a - b);
      const target = dir > 0 ? centers.find((x) => x > c + 12) : [...centers].reverse().find((x) => x < c - 12);
      if (target == null) return;
      street.scrollTo({ left: target - street.clientWidth / 2, behavior: behavior() });
    }
    $('#prev') && $('#prev').addEventListener('click', () => step(-1));
    $('#next') && $('#next').addEventListener('click', () => step(1));
    street.addEventListener('keydown', (e) => {
      if (e.target !== street) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      if (e.key === 'Home') { e.preventDefault(); street.scrollTo({ left: 0, behavior: behavior() }); }
      if (e.key === 'End') { e.preventDefault(); street.scrollTo({ left: track.clientWidth, behavior: behavior() }); }
    });

    /* ---------- wheel scrolls sideways; mouse drag pans ---------- */
    street.addEventListener('wheel', (e) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const max = street.scrollWidth - street.clientWidth;
      if ((street.scrollLeft <= 0 && e.deltaY < 0) || (street.scrollLeft >= max - 1 && e.deltaY > 0)) return;
      e.preventDefault();
      street.scrollLeft += e.deltaY * (e.deltaMode === 1 ? 32 : 1);
    }, { passive: false });
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

    /* ---------- paper grain ---------- */
    try {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 120;
      const g = cv.getContext('2d');
      const img = g.createImageData(120, 120);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 200 + Math.random() * 55;
        img.data[i] = v; img.data[i + 1] = v * 0.97; img.data[i + 2] = v * 0.92; img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      $('#layer-grain').style.backgroundImage = `url(${cv.toDataURL()})`;
    } catch (e) { /* texture is optional */ }

    /* ---------- Daytime / Evening ---------- */
    const marketEl = $('.market');
    function setScene(scene) {
      marketEl.dataset.scene = scene;
      document.querySelectorAll('.scene-switch button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scene === scene)));
    }
    // evening from 8 pm to 6 am on the visitor's clock; a manual choice lasts for the visit
    const hour = new Date().getHours();
    let scene = hour >= 20 || hour < 6 ? 'evening' : 'day';
    try {
      const saved = sessionStorage.getItem('th-scene');
      if (saved === 'evening' || saved === 'day') scene = saved;
    } catch (e) { /* keep the clock default */ }
    setScene(scene);
    document.querySelectorAll('.scene-switch button').forEach((b) => b.addEventListener('click', () => {
      setScene(b.dataset.scene);
      try { sessionStorage.setItem('th-scene', b.dataset.scene); } catch (e) { /* optional */ }
    }));

    onScroll();

    /* ---------- the entrance: the arch first, then a walk into the square ---------- */
    if (TH.mountEntrance) {
      TH.mountEntrance({
        businesses: placed.map((p) => p.b),
        onWalkIn() {
          street.scrollLeft = 0;
          onScroll();
          if (!reduceMotion.matches) setTimeout(() => street.scrollTo({ left: 260 * scale(), behavior: 'smooth' }), 450);
          street.focus({ preventScroll: true });
        },
        onBack() { if (nowName) nowName.textContent = 'The gateway arch'; }
      });
    }

    return {
      focusBusiness(id) {
        const p = placed.find((q) => q.b && q.b.id === id);
        if (!p) return;
        street.scrollTo({ left: centerOf(p.slot) - street.clientWidth / 2, behavior: behavior() });
        p.el.focus({ preventScroll: true });
      },
      occupiedSlots: placed.filter((p) => p.b).map((p) => p.index)
    };
  };

  TH.escape = esc;
})();
