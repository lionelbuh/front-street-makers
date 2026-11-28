/*
 * ENTRANCE — the first thing a visitor sees: the Temecula gateway arch,
 * centred, with a lane of today's chalets running away under festoon lights.
 * "Walk in" (or a click anywhere behind the arch) draws the visitor through
 * the arch, which fades away, and reveals the market square (street.js).
 *
 *   TH.mountEntrance({ businesses, onWalkIn, onBack })
 *     businesses  one entry per street slot: a business, or null for an open chalet
 *
 * The large, unchanging pieces (sky, hills, ground, facades, festoons) are a
 * picture rendered beforehand with tools/render-entrance.mjs, so phones never
 * hold dozens of large 3D layers. Chalets, lamps, trees, people and the arch
 * stay live, so the lane always shows today's businesses.
 */
(function () {
  'use strict';
  const TH = (window.TH = window.TH || {});
  const $ = (s, el = document) => el.querySelector(s);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // the stage is drawn at 2600 x 1000 and scaled to cover the frame
  const SW = 2600, SH = 1000;
  const LANE = 380, WALL = 760, FAR = 5600, SP = 700, NEAR = 1100;
  const BAKE = Boolean(window.__BAKE_ENTRANCE__); // set only by tools/render-entrance.mjs

  TH.mountEntrance = function mountEntrance({ businesses = [], onWalkIn = () => {}, onBack = () => {} } = {}) {
    const root = $('#entrance');
    const stage = $('#entrance-stage');
    if (!root || !stage || !TH.SCENE_KIT) return null;
    const K = TH.SCENE_KIT;
    const { n, rect, circ, ell } = K;
    const root0 = document.documentElement.dataset.root || '';

    const defs = `<defs><pattern id="ent-planks" width="22" height="18" patternUnits="userSpaceOnUse"><rect width="1.5" height="18" fill="rgba(40,25,15,.25)"/></pattern>
      <pattern id="clap" width="40" height="10" patternUnits="userSpaceOnUse"><rect y="8.6" width="40" height="1.4" fill="rgba(40,25,15,.16)"/><rect y="0" width="40" height="1" fill="rgba(255,255,255,.10)"/></pattern>
      <pattern id="bricks" width="26" height="13" patternUnits="userSpaceOnUse"><rect y="5.8" width="26" height="1.2" fill="rgba(235,220,195,.35)"/><rect y="12" width="26" height="1.2" fill="rgba(235,220,195,.35)"/><rect x="0" y="0" width="1.2" height="6" fill="rgba(235,220,195,.35)"/><rect x="13" y="6.5" width="1.2" height="6" fill="rgba(235,220,195,.35)"/></pattern>
      <pattern id="shingle" width="12" height="8" patternUnits="userSpaceOnUse"><path d="M0,8 q6,-6 12,0" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1"/></pattern>
      <linearGradient id="porchShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e140c" stop-opacity=".38"/><stop offset="1" stop-color="#1e140c" stop-opacity="0"/></linearGradient>
      <radialGradient id="halo"><stop offset="0" stop-color="#ffd27a" stop-opacity=".75"/><stop offset=".35" stop-color="#ffb24a" stop-opacity=".25"/><stop offset="1" stop-color="#ff9a3a" stop-opacity="0"/></radialGradient></defs>`;
    const svg = (vb, body, extra = '') => `<svg viewBox="${vb}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" ${extra}>${defs}${body}</svg>`;
    const el = (cls, style, html = '') => { const d = document.createElement('div'); d.className = cls; Object.assign(d.style, style); d.innerHTML = html; return d; };

    stage.innerHTML = '';
    const world = el('ent-world', {});

    /* ---------- the baked background ---------- */
    if (!BAKE) {
      stage.insertAdjacentHTML('beforeend',
        `<img class="ent-bg ent-bg--day" src="${root0}assets/img/entrance/lane-day.jpg" alt="" decoding="async">` +
        `<img class="ent-bg ent-bg--evening" src="${root0}assets/img/entrance/lane-evening.jpg" alt="" loading="lazy" decoding="async">`);
    }
    stage.appendChild(world);

    if (BAKE) {
      // sky, hills, ground, facades and festoons: everything that never changes
      const sky = document.createElement('div');
      TH.renderMountains(sky);
      const mtn = sky.innerHTML.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
      TH.renderHills(sky);
      const hills = sky.innerHTML.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
      stage.insertBefore(el('ent-sky', {}, svg(`0 0 ${SW} ${SH}`, `<g transform="translate(-50,128)"><svg width="2700" height="820" viewBox="0 0 2700 820" preserveAspectRatio="none" overflow="visible">${mtn}${hills}</svg></g>`)), world);
      const flat = { transformOrigin: '50% 0' };
      world.appendChild(el('ent-plane ent-floor', Object.assign({ left: -LANE + 'px', top: '0', width: 2 * LANE + 'px', height: NEAR + FAR + 'px', transform: `translateZ(${NEAR}px) rotateX(-90deg)` }, flat)));
      [-1, 1].forEach((side) => world.appendChild(el('ent-plane ent-walk', Object.assign({ left: (side < 0 ? -WALL : LANE) + 'px', top: '0', width: WALL - LANE + 'px', height: NEAR + FAR + 'px', transform: `translateZ(${NEAR}px) rotateX(-90deg)` }, flat))));
      const wall = (row, side) => {
        K.resetLights();
        let x = 0, seed = side < 0 ? 4 : 11, b = '';
        row.forEach(([type, w]) => { b += type === 'tree' ? K.tree(x - 30, w + 60, seed++ * 17) : K[type](x, w, { color: '#d8cdb6', parapet: 'peak' }); x += w; });
        b += rect(0, K.BASE, x, 20, 'fill="#9c7c5a"') + rect(0, K.BASE, x, 20, 'fill="url(#ent-planks)"');
        const w = x * 2, h = 980;
        const base = side < 0 ? { left: -WALL + 'px', top: -h + 'px', width: w + 'px', height: h + 'px', transformOrigin: '0 100%' } : { left: WALL - w + 'px', top: -h + 'px', width: w + 'px', height: h + 'px', transformOrigin: '100% 100%' };
        const rot = side < 0 ? 'rotateY(90deg)' : 'rotateY(-90deg)';
        world.appendChild(el('ent-plane', Object.assign({}, base, { transform: `translateZ(${NEAR}px) ${rot}` }), svg(`0 0 ${x} 490`, b)));
        world.appendChild(el('ent-glow', Object.assign({}, base, { transform: `translateX(${-side * 3}px) translateZ(${NEAR}px) ${rot}` }), svg(`0 0 ${x} 490`, K.lights())));
      };
      wall([['victorianGrey', 360], ['westernBalcony', 340], ['hotelTemecula', 520], ['tree', 140], ['victorianGrey', 360], ['mercantile', 380], ['bank1914', 400], ['weltyStore', 360], ['machadoStore', 420]], -1);
      wall([['bank1914', 400], ['woodClock', 400], ['theaterRow', 440], ['tree', 140], ['weltyStore', 360], ['falseFront', 260], ['mercantile', 380], ['victorianGrey', 360], ['bank1914', 400]], 1);
      K.resetLights();
      let ex = 0, eb = '';
      [['hotelTemecula', 520], ['tree', 120], ['woodClock', 400]].forEach(([type, w]) => { eb += type === 'tree' ? K.tree(ex - 30, w + 60, 77) : K[type](ex, w); ex += w; });
      eb += rect(0, K.BASE, ex, 20, 'fill="#9c7c5a"');
      const eh = 490 * ((2 * WALL) / ex);
      const est = { left: -WALL + 'px', top: -eh + 'px', width: 2 * WALL + 'px', height: eh + 'px', transform: `translateZ(${-FAR}px)` };
      world.appendChild(el('ent-plane', est, svg(`0 0 ${ex} 490`, eb)));
      world.appendChild(el('ent-glow', Object.assign({}, est, { transform: `translateZ(${-FAR + 3}px)` }), svg(`0 0 ${ex} 490`, K.lights())));
      for (let d = 250; d < FAR; d += 650) {
        let cord = '', glow = '';
        const sag = 90 + (d % 3) * 20;
        cord += `<path d="M0,20 Q760,${20 + 2 * sag} 1520,20" stroke="#2d2a26" stroke-width="3" fill="none"/>`;
        for (let i = 1; i < 20; i++) {
          const t = i / 20, bx = 2 * t * (1 - t) * 760 + t * t * 1520, by = (1 - t) * (1 - t) * 20 + 2 * t * (1 - t) * (20 + 2 * sag) + t * t * 20;
          cord += `<path d="M${n(bx)},${n(by)} v10" stroke="#2d2a26" stroke-width="2"/>` + ell(bx, by + 18, 6.5, 9, 'class="bulb"');
          glow += circ(bx, by + 18, 30, 'fill="url(#halo)"') + ell(bx, by + 18, 6, 8.5, 'fill="#fff1c9"');
        }
        const st = { left: -WALL + 'px', top: '-840px', width: 2 * WALL + 'px', height: '300px', transform: `translateZ(${-d}px)` };
        world.appendChild(el('ent-plane', st, svg('0 0 1520 300', cord)));
        world.appendChild(el('ent-glow', Object.assign({}, st, { transform: `translateZ(${-d + 2}px)` }), svg('0 0 1520 300', glow)));
      }
    }

    /* ---------- live: today's chalets, lamps and pepper trees ---------- */
    const CW = 300, CH = 375;
    if (!BAKE) for (let i = 0; i < 7; i++) {
      [-1, 1].forEach((side) => {
        const b = businesses[side < 0 ? i * 2 : i * 2 + 1];
        const d = (side < 0 ? 220 : 570) + i * SP;
        const k = CW / TH.CHALET.width, BW = TH.CHALET.box * k, BL = TH.CHALET.left * k;
        world.appendChild(el('ent-chalet', { left: side * 540 - CW / 2 - BL + 'px', top: -CH + 'px', width: BW + 'px', height: CH + 'px', transformOrigin: `${((BL + CW / 2) / BW) * 100}% 100%`, transform: `translateZ(${-d}px) rotateY(${-side * 62}deg)` },
          b ? TH.renderChalet(b) : TH.renderEmptyChalet()));
        const ld = d + SP / 2;
        if (ld > FAR - 400) return;
        if ((i + (side > 0 ? 1 : 0)) % 3 === 2) {
          world.appendChild(el('ent-plane ent-tree', { left: side * 430 - 323 + 'px', top: -619 + 'px', width: '646px', height: '619px', transform: `translateZ(${-ld}px)` },
            svg('-40 110 380 364', `<g class="ent-sway">${K.tree(0, 300, 40 + i * 7 + side, { top: 150 })}</g>`)));
        } else {
          K.resetLights();
          const lamp = K.twinLamp(60, 430, 60);
          const st = { left: side * 400 - 78 + 'px', top: '-559px', width: '156px', height: '559px', transform: `translateZ(${-ld}px)` };
          world.appendChild(el('ent-plane', st, svg('0 0 120 430', lamp)));
          world.appendChild(el('ent-glow', Object.assign({}, st, { transform: `translateZ(${-ld + 2}px)` }), svg('0 0 120 430', K.lights())));
        }
      });
    }

    /* ---------- live: a few strollers ---------- */
    const people = [];
    if (!BAKE && TH.crowdKit) {
      const C = TH.crowdKit, r = C.rng(314);
      ['couple', 'single', 'family', 'single', 'couple', 'grand', 'dog', 'single'].forEach((type) => {
        const shape = C.makeGroup(type, r), P = 1.6;
        const w = (shape.maxX - shape.minX) * P, h = (shape.bottom - shape.top) * P;
        const node = el('ent-person walker walking', { left: -w / 2 + 'px', top: -h + 'px', width: w + 'px', height: h + 'px' },
          `<svg viewBox="${shape.minX} ${shape.top} ${shape.maxX - shape.minX} ${shape.bottom - shape.top}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><g class="figure">${shape.svg}</g></svg>`);
        world.appendChild(node);
        const g = { node, d: 300 + r() * (FAR - 1200), x: -280 + r() * 560, vd: (r() < 0.5 ? 1 : -1) * (110 + r() * 60), vx: (r() < 0.5 ? -1 : 1) * (12 + r() * 16) };
        node.classList.toggle('walker--left', g.vx < 0);
        node.style.transform = `translate3d(${n(g.x)}px,0,${n(-g.d)}px)`;
        people.push(g);
      });
    }

    /* ---------- the arch, in front of everything ---------- */
    if (!BAKE) stage.appendChild(el('ent-arch', { left: (SW - 1600) / 2 + 'px', width: '1600px' }, svg('0 -60 1500 880', `<g class="ent-arch-g">${K.gatewayArch()}</g>`, 'preserveAspectRatio="xMidYMax slice"')));

    /* ---------- fit: cover the frame, keeping the arch's base in view ---------- */
    function fit() {
      const W = root.clientWidth, H = root.clientHeight;
      if (!W || !H) return;
      const k = Math.max(W / SW, H / SH);
      stage.style.transform = `translate(${n((W - SW * k) / 2)}px,${n((H - SH * k) * 0.7)}px) scale(${k})`;
    }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(root);
    else window.addEventListener('resize', fit);
    if (BAKE) return null;

    /* ---------- walk in / back ---------- */
    let mode = 'arch';
    document.body.classList.add('at-arch');
    const enter = $('#enter');
    const back = $('#to-arch');
    function walkIn() {
      if (mode !== 'arch') return;
      mode = 'entering';
      const quick = reduceMotion.matches;
      root.classList.add('entering');
      setTimeout(() => {
        document.body.classList.remove('at-arch');
        onWalkIn();
      }, quick ? 0 : 1150);
      setTimeout(() => { mode = 'street'; root.hidden = true; root.classList.remove('entering'); if (back) back.hidden = false; }, quick ? 0 : 1800);
    }
    function backToArch() {
      mode = 'arch';
      root.hidden = false;
      document.body.classList.add('at-arch');
      if (back) back.hidden = true;
      onBack();
    }
    root.addEventListener('click', walkIn);
    root.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); walkIn(); } });
    if (enter) enter.addEventListener('click', walkIn);
    if (back) back.addEventListener('click', backToArch);
    ['#prev', '#next', '#map'].forEach((s) => { const b = $(s); if (b) b.addEventListener('click', (e) => { if (mode === 'arch') { e.stopImmediatePropagation(); walkIn(); } }, true); });

    /* ---------- strollers walk while the arch is on screen ---------- */
    let last = performance.now();
    function tick(now) {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (mode !== 'street' && !document.hidden) {
        people.forEach((g) => {
          g.d += g.vd * dt; g.x += g.vx * dt;
          if (Math.abs(g.x) > LANE - 70) { g.vx = -g.vx; g.x = Math.sign(g.x) * (LANE - 70); g.node.classList.toggle('walker--left', g.vx < 0); }
          if (g.d > FAR - 300) g.d = 40;
          if (g.d < 30) g.d = FAR - 400;
          g.node.style.transform = `translate3d(${n(g.x)}px,0,${n(-g.d)}px)`;
        });
      }
      requestAnimationFrame(tick);
    }
    if (!reduceMotion.matches) requestAnimationFrame(tick);

    return { walkIn, backToArch };
  };
})();
