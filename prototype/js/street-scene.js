/*
 * STREET SCENE — the illustrated architecture of Old Town Temecula.
 *
 * This file knows nothing about businesses. It draws:
 *   - two parallax landscape layers (mountains + vineyard hills, balloons)
 *   - the architecture layer: the ironwork gateway arch with a perspective
 *     view down Front Street, then the long elevation of storefronts
 *   - a "lights" layer used for the evening (dark theme) scene
 * and it publishes a list of empty stall SLOTS (TH.STREET.slots) where the
 * marketplace places independent stall components.
 *
 * Everything is drawn in one coordinate space: W x H "street units".
 */
(function () {
  'use strict';
  const TH = (window.TH = window.TH || {});

  const H = 720;
  const BASE = 470; // bottom of building facades / top of boardwalk
  const WALK_H = 18;
  const GATE_W = 1500; // width of the gateway (perspective) panel
  const SLOT_COUNT = 12;
  const SLOT_START = 1880;
  const SLOT_GAP = 400;
  const STALL_W = 240;
  const STALL_H = 320;
  const STALL_BOTTOM = 706;
  const W = SLOT_START + (SLOT_COUNT - 1) * SLOT_GAP + 860; // 7140

  TH.STREET = {
    W, H, BASE, GATE_W, STALL_W, STALL_H, STALL_BOTTOM,
    slots: Array.from({ length: SLOT_COUNT }, (_, i) => ({ index: i, x: SLOT_START + i * SLOT_GAP }))
  };

  /* ---------- tiny SVG helpers ---------- */
  const n = (v) => Math.round(v * 10) / 10;
  const rect = (x, y, w, h, a = '') => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" ${a}/>`;
  const poly = (pts, a = '') => `<polygon points="${pts.map((p) => n(p[0]) + ',' + n(p[1])).join(' ')}" ${a}/>`;
  const line = (x1, y1, x2, y2, a = '') => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" ${a}/>`;
  const circ = (cx, cy, r, a = '') => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" ${a}/>`;
  const ell = (cx, cy, rx, ry, a = '') => `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" ${a}/>`;

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const IRON = '#2a2826';
  const IRON_HI = '#4b4640';
  const WOOD = '#7a5a3e';
  const WOOD_DK = '#5a4130';
  const WOOD_LT = '#a07a55';
  const TRIM = '#efe6d2';

  // lights collected while drawing, rendered in the evening layer
  let LIGHTS = [];

  /* =====================================================================
     LANDSCAPE (parallax layers)
     ===================================================================== */
  function ridge(r, y0, amp, step, w) {
    const pts = [];
    const p1 = r() * 6, p2 = r() * 6, p3 = r() * 6;
    for (let x = -20; x <= w + 20; x += step) {
      const y = y0 + Math.sin(x / 520 + p1) * amp + Math.sin(x / 190 + p2) * amp * 0.38 + Math.sin(x / 75 + p3) * amp * 0.08;
      pts.push([x, y]);
    }
    return pts;
  }
  const ridgePath = (pts) => `M${pts.map((p) => n(p[0]) + ',' + n(p[1])).join(' L')} L${W + 20},${H} L-20,${H} Z`;

  function balloon(x, y, s, c1, c2) {
    let g = `<g transform="translate(${x},${y}) scale(${s})">`;
    const env = 'M0,-46 C30,-46 40,-20 34,0 C28,18 12,30 8,40 L-8,40 C-12,30 -28,18 -34,0 C-40,-20 -30,-46 0,-46 Z';
    g += `<path d="${env}" fill="${c1}"/>`;
    g += `<path d="M0,-46 C14,-46 18,-20 15,0 C12,18 6,30 4,40 L-4,40 C-6,30 -12,18 -15,0 C-18,-20 -14,-46 0,-46 Z" fill="${c2}"/>`;
    g += `<path d="M0,-46 C4,-30 4,10 0,40" stroke="${c1}" stroke-width="3" fill="none"/>`;
    g += line(-8, 40, -5, 52, 'stroke="#5a4a3a" stroke-width="1"') + line(8, 40, 5, 52, 'stroke="#5a4a3a" stroke-width="1"');
    g += rect(-6, 52, 12, 9, 'fill="#7a5a3e"');
    return g + '</g>';
  }

  TH.renderMountains = function (svg) {
    const r = rng(11);
    let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">`;
    // stars (evening only)
    for (let i = 0; i < 90; i++) s += circ(r() * W, r() * 230, r() * 1.4 + 0.4, 'class="star"');
    // clouds
    for (let i = 0; i < 9; i++) {
      const cx = 300 + i * 790 + r() * 200, cy = 70 + r() * 90;
      s += `<g class="cloud">${ell(cx, cy, 90, 18)}${ell(cx - 40, cy - 8, 45, 16)}${ell(cx + 30, cy - 12, 55, 20)}</g>`;
    }
    s += `<path class="mtn-far" d="${ridgePath(ridge(r, 300, 34, 24, W))}"/>`;
    s += `<path class="mtn" d="${ridgePath(ridge(r, 330, 28, 20, W))}"/>`;
    // hot-air balloons: a Temecula Valley signature
    s += balloon(980, 150, 0.9, '#c8573f', '#e9c46a');
    s += balloon(2500, 110, 0.7, '#3f6c8c', '#e8dcc0');
    s += balloon(3900, 170, 0.8, '#6b2d45', '#d9a23a');
    s += balloon(5600, 120, 0.65, '#5c7f48', '#f0e6c8');
    svg.innerHTML = s + '</svg>';
  };

  TH.renderHills = function (svg) {
    const r = rng(29);
    let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="vines" width="16" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
          <rect width="16" height="2.4" y="3" class="vine-row"/>
        </pattern>
        <pattern id="vines2" width="14" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(10)">
          <rect width="14" height="2.2" y="3" class="vine-row"/>
        </pattern>
      </defs>`;
    const back = ridge(r, 355, 24, 18, W);
    const front = ridge(r, 392, 20, 18, W);
    s += `<path class="hill-back" d="${ridgePath(back)}"/>`;
    s += `<path d="${ridgePath(back)}" fill="url(#vines2)" opacity=".55"/>`;
    s += `<path class="hill" d="${ridgePath(front)}"/>`;
    s += `<path d="${ridgePath(front)}" fill="url(#vines)" opacity=".6"/>`;
    // oaks on the crests
    for (let i = 0; i < 70; i++) {
      const p = back[Math.floor(r() * back.length)];
      const sz = 4 + r() * 6;
      s += `<g class="oak">${ell(p[0], p[1] - sz * 0.4, sz * 1.5, sz)}${ell(p[0] + sz, p[1] - sz * 0.2, sz, sz * 0.7)}</g>`;
    }
    for (let i = 0; i < 50; i++) {
      const p = front[Math.floor(r() * front.length)];
      const sz = 6 + r() * 7;
      s += `<g class="oak oak-near">${ell(p[0], p[1] - sz * 0.3, sz * 1.6, sz)}${ell(p[0] - sz, p[1], sz, sz * 0.7)}</g>`;
    }
    svg.innerHTML = s + '</svg>';
  };

  /* =====================================================================
     ELEVATION BUILDING KIT
     ===================================================================== */

  function win(x, y, w, h, o = {}) {
    const t = o.trim || TRIM;
    let s = '';
    if (o.arch) {
      const r = w / 2;
      const outer = `M${n(x - 5)},${n(y + h + 4)} L${n(x - 5)},${n(y + r)} A${n(r + 5)},${n(r + 5)} 0 0 1 ${n(x + w + 5)},${n(y + r)} L${n(x + w + 5)},${n(y + h + 4)} Z`;
      const inner = `M${n(x)},${n(y + h)} L${n(x)},${n(y + r)} A${n(r)},${n(r)} 0 0 1 ${n(x + w)},${n(y + r)} L${n(x + w)},${n(y + h)} Z`;
      s += `<path d="${outer}" fill="${t}"/>`;
      s += `<path d="${inner}" class="glass"/>`;
      s += rect(x + w / 2 - 4, y - 8, 8, 10, `fill="${t}"`); // keystone
      LIGHTS.push(`<path d="${inner}" class="lit"/>`);
    } else {
      s += rect(x - 7, y - 11, w + 14, 7, `fill="${t}"`); // head trim
      s += rect(x - 4, y - 4, w + 8, h + 8, `fill="${t}"`);
      s += rect(x, y, w, h, 'class="glass"');
      LIGHTS.push(rect(x, y, w, h, 'class="lit"'));
    }
    s += poly([[x + w * 0.15, y + h], [x + w * 0.55, y], [x + w * 0.8, y], [x + w * 0.4, y + h]], 'class="shine"');
    s += rect(x + w / 2 - 1.5, y + (o.arch ? w / 2 : 0), 3, h - (o.arch ? w / 2 : 0), `fill="${t}"`);
    s += rect(x, y + h * 0.52, w, 3, `fill="${t}"`);
    s += rect(x - 7, y + h + 3, w + 14, 5, `fill="${t}"`); // sill
    if (o.flowers) s += flowerBox(x - 6, y + h + 8, w + 12, o.flowerColor);
    return s;
  }

  function flowerBox(x, y, w, color) {
    let s = rect(x, y, w, 10, `fill="${WOOD}"`);
    const cols = [color || '#c8423b', '#e7a1a6', '#f2efe4'];
    for (let i = 0; i < w / 7; i++) {
      const fx = x + 3 + i * 7;
      s += ell(fx, y - 1, 5, 4, 'fill="#5b7a43"');
    }
    for (let i = 0; i < w / 6; i++) {
      const fx = x + 3 + i * 6;
      s += circ(fx, y - 3 - (i % 2) * 2, 2.6, `fill="${cols[i % 3]}"`);
    }
    // trailing ivy
    for (let i = 0; i < 3; i++) {
      const fx = x + w * (0.2 + i * 0.3);
      s += `<path d="M${n(fx)},${n(y + 9)} q3,8 -1,16" stroke="#5b7a43" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    }
    return s;
  }

  function door(x, y, w, h, color) {
    let s = rect(x - 4, y - 6, w + 8, h + 6, `fill="${TRIM}"`);
    s += rect(x, y, w, h, `fill="${color || WOOD}"`);
    s += rect(x + 6, y + 6, w - 12, h * 0.46, 'class="glass"');
    LIGHTS.push(rect(x + 6, y + 6, w - 12, h * 0.46, 'class="lit"'));
    s += rect(x + 6, y + h * 0.6, w - 12, h * 0.3, 'fill="rgba(0,0,0,.12)"');
    s += circ(x + w - 7, y + h * 0.56, 2, 'fill="#d9b36a"');
    return s;
  }

  function storefront(x, w, top, color) {
    // display windows either side of a recessed door, with kickplates
    const dw = 42;
    const dx = x + w / 2 - dw / 2;
    let s = rect(x + 6, top, w - 12, BASE - top, `fill="${shade(color, -0.08)}"`);
    s += rect(x + 6, top, w - 12, 18, `fill="${TRIM}"`); // transom bar
    const gl = [[x + 16, dx - 10], [dx + dw + 10, x + w - 16]];
    gl.forEach(([a, b]) => {
      if (b - a < 20) return;
      s += rect(a - 3, top + 22, b - a + 6, BASE - top - 44, `fill="${TRIM}"`);
      s += rect(a, top + 25, b - a, BASE - top - 52, 'class="glass"');
      LIGHTS.push(rect(a, top + 25, b - a, BASE - top - 52, 'class="lit"'));
      const m = Math.max(1, Math.round((b - a) / 40));
      for (let i = 1; i < m; i++) s += rect(a + ((b - a) / m) * i - 1.5, top + 25, 3, BASE - top - 52, `fill="${TRIM}"`);
      s += poly([[a + 6, BASE - 27], [a + (b - a) * 0.45, top + 25], [a + (b - a) * 0.6, top + 25], [a + 22, BASE - 27]], 'class="shine"');
      s += rect(a - 3, BASE - 22, b - a + 6, 22, `fill="${shade(color, -0.2)}"`); // kickplate
      s += rect(a + 3, BASE - 18, b - a - 6, 14, `fill="${shade(color, -0.1)}"`);
    });
    s += door(dx, top + 22, dw, BASE - top - 22, shade(color, -0.35));
    return s;
  }

  function porch(x, w, y, o = {}) {
    let s = '';
    // shade under the porch roof
    s += rect(x, y + 10, w, 70, 'fill="url(#porchShade)"');
    // roof edge and fascia
    s += rect(x - 10, y - 9, w + 20, 9, `fill="${o.roof || '#8c8579'}"`);
    s += rect(x - 10, y - 9, w + 20, 2, 'fill="rgba(255,255,255,.25)"');
    s += rect(x - 8, y, w + 16, 11, `fill="${o.fascia || WOOD_LT}"`);
    const count = Math.max(2, Math.round(w / 115) + 1);
    for (let i = 0; i < count; i++) {
      const px = x - 3 + ((w - 2) / (count - 1)) * i;
      s += rect(px, y + 11, 7, BASE - y - 11, `fill="${o.post || WOOD_LT}"`);
      s += rect(px - 0.5, y + 11, 2, BASE - y - 11, 'fill="rgba(0,0,0,.18)"');
      if (i > 0) s += poly([[px, y + 11], [px - 14, y + 11], [px, y + 25]], `fill="${o.post || WOOD_LT}"`);
      if (i < count - 1) s += poly([[px + 7, y + 11], [px + 21, y + 11], [px + 7, y + 25]], `fill="${o.post || WOOD_LT}"`);
    }
    if (o.balcony) {
      const by = y - 9;
      s += rect(x - 8, by - 34, w + 16, 5, `fill="${o.post || WOOD_LT}"`);
      for (let bx = x - 4; bx < x + w + 6; bx += 9) s += rect(bx, by - 30, 3, 30, `fill="${o.post || WOOD_LT}"`);
      s += rect(x - 8, by - 4, w + 16, 4, `fill="${o.post || WOOD_LT}"`);
    }
    return s;
  }

  function signBand(x, y, w, h, text, color, ink) {
    let s = rect(x, y, w, h, `fill="${color}"`);
    s += rect(x + 3, y + 3, w - 6, h - 6, `fill="none" stroke="${ink}" stroke-opacity=".35" stroke-width="1.2"`);
    if (text) {
      const fs = Math.min(h * 0.55, (w * 0.82) / (text.length * 0.66));
      s += `<text x="${n(x + w / 2)}" y="${n(y + h / 2 + fs * 0.36)}" text-anchor="middle" font-size="${n(fs)}" class="sign-paint" fill="${ink}">${text}</text>`;
    }
    return s;
  }

  function shade(hex, amt) {
    const c = hex.replace('#', '');
    const v = [0, 2, 4].map((i) => parseInt(c.substr(i, 2), 16));
    const out = v.map((ch) => {
      const t = amt < 0 ? 0 : 255;
      return Math.round(ch + (t - ch) * Math.abs(amt));
    });
    return '#' + out.map((ch) => ch.toString(16).padStart(2, '0')).join('');
  }

  /* --- building types --- */

  function falseFront(x, w, o) {
    const stories = o.stories || 1;
    const bodyTop = BASE - (stories === 2 ? 250 : 170);
    const pTop = bodyTop - (o.parapetH || 48);
    let outline;
    if (o.parapet === 'stepped') {
      outline = [[x, pTop + 30], [x + w * 0.18, pTop + 30], [x + w * 0.18, pTop + 15], [x + w * 0.34, pTop + 15], [x + w * 0.34, pTop], [x + w * 0.66, pTop], [x + w * 0.66, pTop + 15], [x + w * 0.82, pTop + 15], [x + w * 0.82, pTop + 30], [x + w, pTop + 30]];
    } else if (o.parapet === 'peak') {
      outline = [[x, pTop + 34], [x + w * 0.3, pTop + 34], [x + w / 2, pTop], [x + w * 0.7, pTop + 34], [x + w, pTop + 34]];
    } else {
      outline = [[x, pTop], [x + w, pTop]];
    }
    const pts = [[x, BASE], ...outline, [x + w, BASE]];
    let s = poly(pts, `fill="${o.color}"`);
    s += poly(pts, 'fill="url(#clap)"');
    // corner boards
    s += rect(x, outline[0][1], 6, BASE - outline[0][1], `fill="${shade(o.color, 0.25)}"`);
    s += rect(x + w - 6, outline[outline.length - 1][1], 6, BASE - outline[outline.length - 1][1], `fill="${shade(o.color, -0.15)}"`);
    // cornice along the top outline
    s += `<polyline points="${outline.map((p) => n(p[0]) + ',' + n(p[1])).join(' ')}" fill="none" stroke="${o.trim || TRIM}" stroke-width="8" stroke-linejoin="miter"/>`;
    if (o.parapet !== 'peak' && o.parapet !== 'stepped') {
      for (let bx = x + 10; bx < x + w - 8; bx += 22) s += rect(bx, pTop + 4, 6, 10, `fill="${o.trim || TRIM}"`);
    }
    const porchY = BASE - 128;
    // sign band
    const signY = stories === 2 ? pTop + 34 : bodyTop - 6;
    s += signBand(x + w * 0.12, signY, w * 0.76, 34, o.sign, o.signColor || TRIM, o.signInk || '#3b2f25');
    if (stories === 2) {
      const n2 = Math.max(2, Math.round(w / 95));
      const ww = 34;
      for (let i = 0; i < n2; i++) {
        const wx = x + (w / n2) * (i + 0.5) - ww / 2;
        s += win(wx, bodyTop + 52, ww, 62, { flowers: o.flowers, flowerColor: o.flowerColor });
      }
    }
    s += storefront(x + 4, w - 8, porchY + 8, o.color);
    s += porch(x, w, porchY, { roof: o.roof, balcony: o.balcony });
    return s;
  }

  function hotel(x, w, o) {
    const top = BASE - 290;
    let s = '';
    // hipped roof peeking above
    s += poly([[x - 8, top + 8], [x + 40, top - 42], [x + w - 40, top - 42], [x + w + 8, top + 8]], `fill="${o.roof || '#6d5d52'}"`);
    s += poly([[x - 8, top + 8], [x + 40, top - 42], [x + w - 40, top - 42], [x + w + 8, top + 8]], 'fill="url(#shingle)"');
    s += rect(x + w * 0.72, top - 74, 22, 40, 'fill="#8e5a45"');
    s += rect(x + w * 0.72 - 3, top - 78, 28, 6, 'fill="#6b4334"');
    s += rect(x, top, w, BASE - top, `fill="${o.color}"`);
    s += rect(x, top, w, BASE - top, 'fill="url(#clap)"');
    s += rect(x - 6, top, w + 12, 9, `fill="${TRIM}"`);
    s += rect(x, top + 9, w, 6, 'fill="rgba(0,0,0,.12)"');
    // upper floor: doors onto the balcony
    const n2 = Math.max(3, Math.round(w / 82));
    for (let i = 0; i < n2; i++) {
      const wx = x + (w / n2) * (i + 0.5) - 17;
      s += win(wx, top + 38, 34, 72, { flowers: o.flowers && i % 2 === 0, flowerColor: o.flowerColor });
    }
    s += storefront(x + 4, w - 8, BASE - 120, o.color);
    s += porch(x, w, BASE - 128, { balcony: true, roof: o.porchRoof || '#7c756c' });
    s += signBand(x + w * 0.22, BASE - 128 - 41, w * 0.56, 28, o.sign, o.signColor || '#3b2f25', o.signInk || TRIM);
    // upper porch roof
    s += rect(x - 10, top + 14, w + 20, 7, 'fill="#7c756c"');
    const c = Math.max(2, Math.round(w / 115) + 1);
    for (let i = 0; i < c; i++) {
      const px = x - 3 + ((w - 2) / (c - 1)) * i;
      s += rect(px, top + 21, 6, BASE - 128 - 9 - (top + 21), `fill="${WOOD_LT}"`);
    }
    return s;
  }

  function brick(x, w, o) {
    const stories = o.stories || 2;
    const top = BASE - (stories === 2 ? 270 : 200);
    const pTop = top - 40;
    const outline = o.parapet === 'stepped'
      ? [[x, pTop + 22], [x + w * 0.28, pTop + 22], [x + w * 0.28, pTop], [x + w * 0.72, pTop], [x + w * 0.72, pTop + 22], [x + w, pTop + 22]]
      : [[x, pTop], [x + w, pTop]];
    const pts = [[x, BASE], ...outline, [x + w, BASE]];
    let s = poly(pts, `fill="${o.color}"`);
    s += poly(pts, 'fill="url(#bricks)"');
    s += `<polyline points="${outline.map((p) => n(p[0]) + ',' + n(p[1])).join(' ')}" fill="none" stroke="${o.trim || '#d8c7a6'}" stroke-width="9"/>`;
    // corbel table
    for (let bx = x + 6; bx < x + w - 6; bx += 14) s += rect(bx, top - 10, 8, 8, `fill="${shade(o.color, -0.18)}"`);
    s += rect(x, top - 2, w, 6, `fill="${o.trim || '#d8c7a6'}"`);
    // pilasters
    s += rect(x, top, 12, BASE - top, `fill="${shade(o.color, 0.1)}"`);
    s += rect(x + w - 12, top, 12, BASE - top, `fill="${shade(o.color, -0.12)}"`);
    if (o.plaque) {
      const fs = Math.min(18, (w * 0.5) / (o.plaque.length * 0.62));
      s += rect(x + w / 2 - w * 0.26, top - 34, w * 0.52, 24, `fill="${o.trim || '#d8c7a6'}"`);
      s += `<text x="${n(x + w / 2)}" y="${n(top - 16)}" text-anchor="middle" font-size="${n(fs)}" class="sign-paint" fill="#4a3426">${o.plaque}</text>`;
    }
    if (stories === 2) {
      const n2 = Math.max(3, Math.round(w / 90));
      for (let i = 0; i < n2; i++) {
        const wx = x + (w / n2) * (i + 0.5) - 17;
        s += win(wx, top + 30, 34, 78, { arch: true, trim: o.trim || '#d8c7a6', flowers: o.flowers, flowerColor: o.flowerColor });
      }
    }
    s += storefront(x + 12, w - 24, BASE - 132, '#4b3b30');
    // striped canvas awning, a European touch
    if (o.awning) s += canvasAwning(x + 14, BASE - 140, w - 28, o.awning);
    return s;
  }

  function canvasAwning(x, y, w, colors) {
    let s = poly([[x, y], [x + w, y], [x + w + 8, y + 34], [x - 8, y + 34]], `fill="${colors[0]}"`);
    const stripes = Math.round(w / 18);
    for (let i = 0; i < stripes; i += 2) {
      const a = i / stripes, b = (i + 1) / stripes;
      s += poly([[x + w * a, y], [x + w * b, y], [x - 8 + (w + 16) * b, y + 34], [x - 8 + (w + 16) * a, y + 34]], `fill="${colors[1]}"`);
    }
    // scalloped valance
    const sw = (w + 16) / stripes;
    for (let i = 0; i < stripes; i++) {
      const sx = x - 8 + sw * i;
      s += `<path d="M${n(sx)},${n(y + 34)} h${n(sw)} v6 q${n(-sw / 2)},12 ${n(-sw)},0 Z" fill="${i % 2 ? colors[1] : colors[0]}"/>`;
    }
    s += rect(x - 8, y + 34, w + 16, 2, 'fill="rgba(0,0,0,.15)"');
    s += rect(x + 2, y + 46, w - 4, 26, 'fill="url(#porchShade)"');
    return s;
  }

  function mission(x, w, o) {
    const top = BASE - 200;
    const d = `M${x},${BASE} L${x},${top} L${n(x + w * 0.22)},${top} C${n(x + w * 0.26)},${top - 30} ${n(x + w * 0.34)},${top - 52} ${n(x + w * 0.5)},${top - 56} C${n(x + w * 0.66)},${top - 52} ${n(x + w * 0.74)},${top - 30} ${n(x + w * 0.78)},${top} L${x + w},${top} L${x + w},${BASE} Z`;
    let s = `<path d="${d}" fill="${o.color}"/>`;
    const cap = `M${x - 4},${top} L${n(x + w * 0.22)},${top} C${n(x + w * 0.26)},${top - 30} ${n(x + w * 0.34)},${top - 52} ${n(x + w * 0.5)},${top - 56} C${n(x + w * 0.66)},${top - 52} ${n(x + w * 0.74)},${top - 30} ${n(x + w * 0.78)},${top} L${x + w + 4},${top}`;
    s += `<path d="${cap}" fill="none" stroke="#a4513a" stroke-width="8" stroke-linejoin="round"/>`;
    s += `<path d="${cap}" fill="none" stroke="#c8735a" stroke-width="2" transform="translate(0,-3)"/>`;
    // quatrefoil window in the parapet
    const qx = x + w / 2, qy = top - 22;
    s += `<g fill="#6a4a35">${circ(qx - 6, qy, 7)}${circ(qx + 6, qy, 7)}${circ(qx, qy - 6, 7)}${circ(qx, qy + 6, 7)}</g>`;
    // stucco mottling
    const r = rng(Math.round(x));
    for (let i = 0; i < 18; i++) s += ell(x + r() * w, top + r() * (BASE - top), 10 + r() * 20, 4 + r() * 6, 'fill="rgba(120,90,60,.06)"');
    // arcade
    const arches = Math.max(2, Math.round(w / 110));
    const aw = (w - 30) / arches;
    for (let i = 0; i < arches; i++) {
      const ax = x + 15 + aw * i + 10, awi = aw - 20;
      const r2 = awi / 2;
      const ay = BASE - 150;
      s += `<path d="M${n(ax)},${BASE} L${n(ax)},${n(ay + r2)} A${n(r2)},${n(r2)} 0 0 1 ${n(ax + awi)},${n(ay + r2)} L${n(ax + awi)},${BASE} Z" fill="#5a4334"/>`;
      s += `<path d="M${n(ax + 8)},${BASE} L${n(ax + 8)},${n(ay + r2 + 6)} A${n(r2 - 8)},${n(r2 - 8)} 0 0 1 ${n(ax + awi - 8)},${n(ay + r2 + 6)} L${n(ax + awi - 8)},${BASE} Z" class="glass"/>`;
      LIGHTS.push(`<path d="M${n(ax + 8)},${BASE} L${n(ax + 8)},${n(ay + r2 + 6)} A${n(r2 - 8)},${n(r2 - 8)} 0 0 1 ${n(ax + awi - 8)},${n(ay + r2 + 6)} L${n(ax + awi - 8)},${BASE} Z" class="lit"/>`);
    }
    if (o.sign) s += `<text x="${n(x + w / 2)}" y="${top + 28}" text-anchor="middle" font-size="16" class="sign-paint" fill="#6a4a35" letter-spacing="3">${o.sign}</text>`;
    // tile-roofed wall lantern
    s += flowerBox(x + 18, BASE - 168, 48, '#c8423b');
    s += flowerBox(x + w - 66, BASE - 168, 48, '#e7a1a6');
    return s;
  }

  function tree(x, w, seed, opts = {}) {
    const r = rng(seed);
    const cx = x + w / 2;
    const top = opts.top || 190;
    let s = `<path d="M${n(cx - 10)},${BASE + 4} C${n(cx - 6)},${BASE - 60} ${n(cx - 16)},${BASE - 120} ${n(cx - 30)},${top + 90} L${n(cx - 20)},${top + 86} C${n(cx - 4)},${BASE - 130} ${n(cx + 2)},${BASE - 80} ${n(cx + 8)},${BASE - 60} C${n(cx + 18)},${BASE - 130} ${n(cx + 34)},${top + 110} ${n(cx + 44)},${top + 96} L${n(cx + 50)},${top + 104} C${n(cx + 30)},${BASE - 110} ${n(cx + 14)},${BASE - 40} ${n(cx + 12)},${BASE + 4} Z" fill="#5d4a3a"/>`;
    const greens = ['#58683f', '#6b7c4b', '#7f8f58', '#4a5a37'];
    for (let i = 0; i < 46; i++) {
      const a = r() * Math.PI * 2, rad = r();
      const ex = cx + Math.cos(a) * rad * w * 0.44;
      const ey = top + 70 + Math.sin(a) * rad * 70 - (1 - rad) * 20;
      s += ell(ex, ey, 18 + r() * 22, 12 + r() * 14, `fill="${greens[Math.floor(r() * greens.length)]}"`);
    }
    // weeping strands (California pepper tree)
    for (let i = 0; i < 14; i++) {
      const sx = cx - w * 0.42 + r() * w * 0.84, sy = top + 90 + r() * 30;
      s += `<path d="M${n(sx)},${n(sy)} q${n(-4 + r() * 8)},30 ${n(-2 + r() * 4)},${n(40 + r() * 30)}" stroke="#6b7c4b" stroke-width="${n(5 + r() * 4)}" fill="none" stroke-linecap="round"/>`;
    }
    return s;
  }

  function waterTower(x) {
    let s = '';
    const top = 110, tankH = 90, legTop = top + tankH, w = 120;
    [0, 36, 84, 120].forEach((dx) => (s += line(x + dx * 0.9 + 6, legTop, x + dx, BASE - 40, `stroke="${WOOD_DK}" stroke-width="7"`)));
    for (let y = legTop + 30; y < BASE - 60; y += 70) {
      s += line(x + 6, y, x + 114, y + 60, `stroke="${WOOD_DK}" stroke-width="3"`);
      s += line(x + 114, y, x + 6, y + 60, `stroke="${WOOD_DK}" stroke-width="3"`);
    }
    s += rect(x - 6, legTop - 4, w + 12, 8, `fill="${WOOD_DK}"`);
    s += rect(x, top, w, tankH, `fill="${WOOD}"`);
    for (let i = 1; i < 12; i++) s += rect(x + i * 10, top, 1.2, tankH, 'fill="rgba(0,0,0,.18)"');
    [top + 16, top + 48, top + 78].forEach((y) => (s += rect(x - 2, y, w + 4, 3, `fill="${IRON_HI}"`)));
    s += poly([[x - 10, top + 2], [x + w / 2, top - 44], [x + w + 10, top + 2]], 'fill="#6d5d52"');
    s += circ(x + w / 2, top - 48, 4, `fill="${IRON}"`);
    return s;
  }

  function lampPost(x, y = STALL_BOTTOM, headY = 350) {
    let s = rect(x - 9, y - 18, 18, 18, `fill="${IRON}"`);
    s += rect(x - 5, y - 40, 10, 24, `fill="${IRON}"`);
    s += rect(x - 2.5, headY + 26, 5, y - 40 - headY - 26, `fill="${IRON}"`);
    s += rect(x - 6, headY + 22, 12, 6, `fill="${IRON}"`);
    s += poly([[x - 13, headY + 22], [x + 13, headY + 22], [x + 9, headY], [x - 9, headY]], 'class="lamp-glass"');
    s += poly([[x - 15, headY], [x + 15, headY], [x, headY - 14]], `fill="${IRON}"`);
    s += circ(x, headY - 16, 3, `fill="${IRON}"`);
    LIGHTS.push(circ(x, headY + 11, 40, 'fill="url(#halo)"'));
    LIGHTS.push(poly([[x - 13, headY + 22], [x + 13, headY + 22], [x + 9, headY], [x - 9, headY]], 'fill="#ffe2a3"'));
    return s;
  }

  function stringLights(x1, y1, x2, y2, sag, count) {
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2 + sag;
    let s = `<path d="M${n(x1)},${n(y1)} Q${n(cx)},${n(cy)} ${n(x2)},${n(y2)}" stroke="#2d2a26" stroke-width="1.6" fill="none"/>`;
    for (let i = 1; i < count; i++) {
      const t = i / count;
      const bx = (1 - t) * (1 - t) * x1 + 2 * t * (1 - t) * cx + t * t * x2;
      const by = (1 - t) * (1 - t) * y1 + 2 * t * (1 - t) * cy + t * t * y2;
      s += line(bx, by, bx, by + 6, 'stroke="#2d2a26" stroke-width="1.2"');
      s += ell(bx, by + 10, 3.6, 5, 'class="bulb"');
      LIGHTS.push(circ(bx, by + 10, 15, 'fill="url(#halo)"'));
      LIGHTS.push(ell(bx, by + 10, 3.4, 4.6, 'fill="#fff1c9"'));
    }
    return s;
  }

  function planter(x, color) {
    let s = rect(x - 18, BASE - 2, 36, 22, `fill="${WOOD}"`);
    s += rect(x - 18, BASE + 3, 36, 3, `fill="${IRON_HI}"`);
    s += rect(x - 18, BASE + 13, 36, 3, `fill="${IRON_HI}"`);
    for (let i = 0; i < 7; i++) s += ell(x - 15 + i * 5, BASE - 6 - (i % 2) * 4, 7, 6, 'fill="#5b7a43"');
    for (let i = 0; i < 6; i++) s += circ(x - 13 + i * 5.2, BASE - 10 - (i % 2) * 5, 2.8, `fill="${color}"`);
    return s;
  }

  function wagonWheel(x, y, r) {
    let s = circ(x, y, r, `fill="none" stroke="${WOOD_DK}" stroke-width="5"`);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      s += line(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, `stroke="${WOOD_DK}" stroke-width="2.4"`);
    }
    return s + circ(x, y, 5, `fill="${WOOD_DK}"`);
  }

  function bench(x) {
    let s = rect(x, BASE - 22, 70, 5, `fill="${WOOD_LT}"`);
    s += rect(x, BASE - 38, 70, 5, `fill="${WOOD_LT}"`);
    s += rect(x + 4, BASE - 38, 4, 38, `fill="${IRON}"`) + rect(x + 62, BASE - 38, 4, 38, `fill="${IRON}"`);
    return s;
  }

  /* =====================================================================
     GATEWAY: the ironwork arch, framing a perspective view of Front Street
     ===================================================================== */
  const VP = [750, 362];
  const FOCAL = 300;
  const PLANE = 700;
  const GROUND = 328;
  function P(side, u, v, off = 0) {
    const k = FOCAL / (FOCAL + u);
    return [VP[0] + side * (PLANE - off) * k, VP[1] + (GROUND - v) * k];
  }
  const quad = (side, u1, u2, v1, v2, off, a) => poly([P(side, u1, v1, off), P(side, u2, v1, off), P(side, u2, v2, off), P(side, u1, v2, off)], a);

  function perspectiveStreet() {
    let s = '';
    const far = 6000;
    // road + boardwalks
    s += poly([[-200, H], [GATE_W + 200, H], P(1, -160, 0, 120), P(1, far, 0, 120), P(-1, far, 0, 120), P(-1, -160, 0, 120)], 'class="street-p"');
    [-1, 1].forEach((side) => {
      s += poly([P(side, -160, 0, 0), P(side, far, 0, 0), P(side, far, 0, 120), P(side, -160, 0, 120)], 'fill="#9c7c5a"');
      // plank lines
      for (let u = -150; u < 2600; u += 30) s += poly([P(side, u, 0, 0), P(side, u + 3, 0, 0), P(side, u + 3, 0, 120), P(side, u, 0, 120)], 'fill="rgba(60,40,25,.18)"');
    });

    const r = rng(7);
    const palette = ['#c9b48a', '#8e9f8a', '#b86f52', '#d8cdb6', '#7e8c93', '#c99a5b', '#a6553f', '#e3d6b8'];
    const signs = ['', 'HOTEL', '', 'GOODS', '', '', 'SALOON', '', '', ''];
    [-1, 1].forEach((side) => {
      const blds = [];
      let u = -170;
      let i = 0;
      while (u < 3400) {
        const len = 240 + r() * 220;
        blds.push({ u1: u, u2: u + len, h: 190 + r() * 120, color: palette[Math.floor(r() * palette.length)], two: r() > 0.45, kind: r(), sign: signs[(i + (side > 0 ? 3 : 0)) % signs.length] });
        u += len + (r() > 0.75 ? 40 : 0);
        i++;
      }
      // painter's order: far to near
      blds.reverse().forEach((b) => {
        const { u1, u2, h } = b;
        const um = (u1 + u2) / 2;
        // facade with false-front top
        let top;
        if (b.kind < 0.33) top = [P(side, u1, h), P(side, um, h + 34), P(side, u2, h)];
        else if (b.kind < 0.6) top = [P(side, u1, h), P(side, u1 + (u2 - u1) * 0.3, h), P(side, u1 + (u2 - u1) * 0.3, h + 18), P(side, u1 + (u2 - u1) * 0.7, h + 18), P(side, u1 + (u2 - u1) * 0.7, h), P(side, u2, h)];
        else top = [P(side, u1, h), P(side, u2, h)];
        s += poly([P(side, u1, 0), ...top, P(side, u2, 0)], `fill="${b.color}"`);
        // side shading so facades read as receding
        s += poly([P(side, u1, 0), ...top, P(side, u2, 0)], 'fill="rgba(40,25,15,.10)"');
        // cornice
        s += `<polyline points="${top.map((p) => n(p[0]) + ',' + n(p[1])).join(' ')}" fill="none" stroke="${TRIM}" stroke-width="${n(6 * FOCAL / (FOCAL + um))}"/>`;
        // sign band
        if (b.sign) {
          s += quad(side, u1 + 30, u2 - 30, h - 14, h - 46, 0, 'fill="#3b2f25"');
        } else {
          s += quad(side, u1 + 30, u2 - 30, h - 14, h - 44, 0, `fill="${TRIM}"`);
        }
        // upper windows
        if (b.two && h > 230) {
          const nw = Math.max(2, Math.round((u2 - u1) / 90));
          for (let j = 0; j < nw; j++) {
            const a = u1 + ((u2 - u1) / nw) * (j + 0.3), c = u1 + ((u2 - u1) / nw) * (j + 0.7);
            s += quad(side, a - 4, c + 4, 222, 154, 0, `fill="${TRIM}"`);
            s += quad(side, a, c, 218, 158, 0, 'class="glass"');
            if (u1 > 200) LIGHTS.push(quad(side, a, c, 218, 158, 0, 'class="lit"'));
          }
        }
        // storefront windows
        s += quad(side, u1 + 20, u2 - 20, 110, 20, 0, 'fill="#4a3a2e"');
        const segs = Math.max(2, Math.round((u2 - u1) / 110));
        for (let j = 0; j < segs; j++) {
          const a = u1 + 24 + ((u2 - u1 - 48) / segs) * j, c = a + (u2 - u1 - 48) / segs - 10;
          s += quad(side, a, c, 104, 28, 0, 'class="glass"');
          if (u1 > 200) LIGHTS.push(quad(side, a, c, 104, 28, 0, 'class="lit"'));
        }
        // porch roof between facade and porch line
        s += poly([P(side, u1, 128, 0), P(side, u2, 128, 0), P(side, u2, 120, 90), P(side, u1, 120, 90)], 'fill="#8c8579"');
        s += poly([P(side, u1, 120, 90), P(side, u2, 120, 90), P(side, u2, 110, 90), P(side, u1, 110, 90)], `fill="${WOOD_LT}"`);
        // porch posts
        for (let pu = u1 + 10; pu < u2; pu += 120) {
          const a = P(side, pu, 110, 86), bb = P(side, pu, 0, 86);
          const k = FOCAL / (FOCAL + pu);
          s += rect(a[0] - 3 * k, a[1], 6 * k, bb[1] - a[1], `fill="${WOOD_LT}"`);
        }
      });
    });

    // decorative market awnings along the street (the market beyond the gate)
    const awnColors = [['#c8902e', '#f2e6cc'], ['#6b2d45', '#e9d9dc'], ['#4e6e7e', '#e4e7e1'], ['#5c7f48', '#eef0de'], ['#b5563f', '#f3e5d2']];
    [-1, 1].forEach((side) => {
      for (let k2 = 0, u = 2400; u > 160; u -= 300, k2++) {
        const u1 = u, u2 = u + 170;
        const [c1, c2] = awnColors[(k2 + (side > 0 ? 2 : 0)) % awnColors.length];
        s += quad(side, u1 + 6, u1 + 12, 150, 0, 130, `fill="${WOOD_DK}"`);
        s += quad(side, u2 - 12, u2 - 6, 150, 0, 130, `fill="${WOOD_DK}"`);
        s += quad(side, u1, u2, 88, 60, 140, `fill="${WOOD}"`);
        s += quad(side, u1, u2, 60, 12, 146, `fill="${c1}"`);
        const st = 6;
        for (let j = 0; j < st; j++) {
          const a = u1 + ((u2 - u1) / st) * j, b = a + (u2 - u1) / st;
          s += poly([P(side, a, 176, 118), P(side, b, 176, 118), P(side, b, 150, 150), P(side, a, 150, 150)], `fill="${j % 2 ? c2 : c1}"`);
        }
      }
    });

    // string lights across the street
    for (let u = 2200; u >= 100; u -= 420) {
      const a = P(-1, u, 250, 60), b = P(1, u, 250, 60);
      const k = FOCAL / (FOCAL + u);
      s += stringLights(a[0], a[1], b[0], b[1], 60 * k, Math.max(8, Math.round(18 * k + 6)));
    }
    return s;
  }

  // ---- ironwork silhouettes (stylised, original drawing) ----
  const HORSE = 'M10,30 C20,22 45,24 62,24 L70,14 C73,8 78,3 84,4 L86,0 L88,5 L98,15 L96,21 L87,20 C82,24 78,30 76,36 L74,44 L79,57 L83,70 L78,70 L72,58 L66,47 L62,49 L64,70 L59,70 L56,50 L30,48 L26,60 L30,70 L25,70 L19,58 L18,47 L14,51 L12,70 L7,70 L8,48 C4,42 4,34 10,30 Z M10,32 C2,36 -1,48 2,58 L6,50 C6,42 8,38 12,36 Z';
  const RIDER = 'M42,24 C42,14 44,6 50,4 C48,0 52,-4 56,-2 C60,-2 61,3 58,6 L62,7 L58,10 C62,16 62,22 60,28 L66,40 L60,40 L54,30 L46,30 Z M44,-6 L64,-6 L62,-9 L58,-9 C57,-14 51,-14 50,-9 L46,-9 Z';
  const STEER = 'M14,24 C20,16 60,16 70,20 L78,14 C84,8 92,6 100,2 C94,8 88,12 86,16 L90,22 L86,34 L80,32 L74,34 L74,50 L76,62 L71,62 L68,48 L62,44 L30,44 L26,50 L27,62 L22,62 L20,46 L16,50 L15,62 L10,62 L11,44 C6,40 8,30 14,24 Z M76,15 C70,8 62,4 54,2 C62,8 68,12 72,18 Z M12,26 C4,30 2,40 4,48 L7,42 C7,36 9,32 13,30 Z';

  function coach(x, y, s) {
    let g = `<g transform="translate(${x},${y}) scale(${s})" fill="${IRON}">`;
    g += '<path d="M14,14 L106,14 L100,56 L20,56 Z"/>';
    g += '<path d="M10,8 L110,8 L110,14 L10,14 Z M30,0 L70,0 L72,8 L28,8 Z"/>'; // roof + luggage
    g += '<path d="M106,22 L128,22 L132,34 L104,40 Z"/>'; // driver's box
    g += '<path d="M116,4 C116,-2 124,-2 124,4 L126,22 L114,22 Z M112,-2 L128,-2 L126,-5 L114,-5 Z"/>'; // driver
    g += '<path d="M124,10 L170,20" stroke="' + IRON + '" stroke-width="2" fill="none"/>'; // reins
    g += '<path d="M128,46 L170,50" stroke="' + IRON + '" stroke-width="4" fill="none"/>'; // pole
    g += '</g>';
    // wheels as open ironwork
    [[x + 34 * s, y + 66 * s, 16 * s], [x + 98 * s, y + 68 * s, 13 * s]].forEach(([cx, cy, r]) => {
      g += circ(cx, cy, r, `fill="none" stroke="${IRON}" stroke-width="${n(3.5 * s)}"`);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        g += line(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r, `stroke="${IRON}" stroke-width="${n(1.8 * s)}"`);
      }
    });
    // window cut-outs
    g += rect(x + 30 * s, y + 20 * s, 22 * s, 14 * s, 'class="arch-sky"') + rect(x + 64 * s, y + 20 * s, 22 * s, 14 * s, 'class="arch-sky"');
    return g;
  }

  function grapes(x, y, s, flip) {
    let g = `<g transform="translate(${x},${y}) scale(${flip ? -s : s},${s})" fill="${IRON}">`;
    const pts = [[0, 0], [8, 0], [16, 0], [4, 7], [12, 7], [8, 14], [0, 14], [16, 14], [4, 21], [12, 21], [8, 28]];
    pts.forEach(([a, b]) => (g += circ(a, b + 10, 4.4)));
    g += '<path d="M8,6 C8,0 10,-6 16,-8 C24,-10 30,-6 34,-14 C30,-2 22,-2 18,-2 C14,-2 12,2 12,8 Z"/>';
    g += '<path d="M20,-6 C26,-22 46,-22 50,-8 C40,-14 30,-10 26,-2 Z"/>'; // leaf
    g += `<path d="M34,-14 C40,-26 56,-22 52,-12 C50,-6 42,-8 44,-14" fill="none" stroke="${IRON}" stroke-width="2"/>`; // tendril
    return g + '</g>';
  }

  function scroll(x, y, s, flip) {
    return `<g transform="translate(${x},${y}) scale(${flip ? -s : s},${s})" fill="none" stroke="${IRON}" stroke-width="4" stroke-linecap="round">
      <path d="M0,0 C30,0 48,-14 46,-34 C44,-48 28,-50 22,-40 C16,-30 26,-20 34,-26"/>
      <path d="M0,-8 C14,-10 22,-20 20,-30"/></g>`;
  }

  function riverRock(x, y, w, h, seed) {
    const r = rng(seed);
    let s = rect(x, y, w, h, 'rx="6" fill="#857867"');
    for (let row = 0; row < h / 14; row++) {
      let cx = x + 4 + (row % 2) * 7;
      while (cx < x + w - 4) {
        const rw = 7 + r() * 8;
        const tones = ['#9d907d', '#b3a48c', '#7f725f', '#c2b39a', '#a1876a'];
        s += ell(Math.min(cx + rw / 2, x + w - rw / 2 - 1), y + 7 + row * 14, rw / 2, 6, `fill="${tones[Math.floor(r() * tones.length)]}" stroke="#5f5446" stroke-width="1"`);
        cx += rw + 1.5;
      }
    }
    s += rect(x - 4, y - 8, w + 8, 10, 'fill="#9a8c78"');
    return s;
  }

  function gatewayArch() {
    let s = '<g class="arch">';
    const L = 236, R = 1264;
    // pillars: river-rock bases with square iron columns
    [L, R].forEach((cx, i) => {
      s += riverRock(cx - 52, 600, 104, 106, 40 + i);
      s += rect(cx - 16, 160, 32, 440, `fill="${IRON}"`);
      s += rect(cx - 16, 160, 6, 440, `fill="${IRON_HI}"`);
      for (let y = 200; y < 590; y += 60) s += rect(cx - 20, y, 40, 6, `fill="${IRON}"`);
      // finial lantern
      s += rect(cx - 22, 152, 44, 10, `fill="${IRON}"`);
      s += poly([[cx - 14, 152], [cx + 14, 152], [cx + 10, 124], [cx - 10, 124]], 'class="lamp-glass"');
      s += poly([[cx - 17, 124], [cx + 17, 124], [cx, 106]], `fill="${IRON}"`);
      s += circ(cx, 103, 4, `fill="${IRON}"`);
      LIGHTS.push(circ(cx, 138, 60, 'fill="url(#halo)"'));
      LIGHTS.push(poly([[cx - 14, 152], [cx + 14, 152], [cx + 10, 124], [cx - 10, 124]], 'fill="#ffe2a3"'));
    });
    // top band (two arcs) with lettering
    const upper = `M${L},206 Q750,-6 ${R},206`;
    const lower = `M${L},262 Q750,46 ${R},262`;
    s += `<path d="${upper} L${R},262 Q750,46 ${L},262 Z" fill="${IRON}"/>`;
    s += `<path d="${upper}" fill="none" stroke="${IRON_HI}" stroke-width="3"/>`;
    s += `<path id="archText" d="M${L},246 Q750,32 ${R},246" fill="none"/>`;
    s += `<text class="arch-letters" font-size="35" letter-spacing="7"><textPath href="#archText" startOffset="50%" text-anchor="middle">OLD TOWN TEMECULA</textPath></text>`;
    // crossbar
    s += rect(L, 316, R - L, 12, `fill="${IRON}"`);
    s += rect(L, 316, R - L, 3, `fill="${IRON_HI}"`);
    // vertical pickets between arc and crossbar near the posts
    for (let x = L + 22; x < L + 90; x += 16) {
      const t = (x - L) / (R - L);
      const y = (1 - t) * (1 - t) * 262 + 2 * t * (1 - t) * 46 + t * t * 262;
      s += rect(x, y, 4, 316 - y, `fill="${IRON}"`);
      s += rect(L + R - x - 4, y, 4, 316 - y, `fill="${IRON}"`);
    }
    // Old West scene standing on the crossbar
    s += `<g fill="${IRON}">`;
    s += `<path d="${STEER}" transform="translate(330,254)"/>`;
    s += `<path d="${HORSE}" transform="translate(440,246)"/><path d="${RIDER}" transform="translate(440,246)"/>`;
    s += '</g>';
    s += coach(560, 238, 1.05);
    s += `<g fill="${IRON}">`;
    s += `<path d="${HORSE}" transform="translate(744,247) scale(.98)"/>`;
    s += `<path d="${HORSE}" transform="translate(756,250) scale(.95)" opacity=".85"/>`;
    s += `<path d="${HORSE}" transform="translate(852,247) scale(.98)"/>`;
    s += `<path d="${HORSE}" transform="translate(864,250) scale(.95)" opacity=".85"/>`;
    s += `<path d="${HORSE}" transform="translate(990,246)"/><path d="${RIDER}" transform="translate(990,246)"/>`;
    s += '</g>';
    s += grapes(1110, 262, 1.15, false);
    s += grapes(1180, 270, 0.9, true);
    s += scroll(L + 30, 314, 0.9, false) + scroll(R - 30, 314, 0.9, true);
    // hanging market sign
    s += line(620, 328, 628, 352, `stroke="${IRON}" stroke-width="2.4"`) + line(880, 328, 872, 352, `stroke="${IRON}" stroke-width="2.4"`);
    s += rect(588, 350, 324, 70, `rx="6" fill="${WOOD_DK}"`);
    s += rect(594, 356, 312, 58, `rx="4" fill="#efe3c8"`);
    s += `<text x="750" y="389" text-anchor="middle" class="sign-paint" font-size="29" fill="#3b2f25">Homegrown Market</text>`;
    s += `<text x="750" y="407" text-anchor="middle" class="sign-small" font-size="9.6" fill="#6b4a32" letter-spacing="1.3">SMALL BUSINESSES · BIG DREAMS · LOCAL ROOTS</text>`;
    return s + '</g>';
  }

  /* =====================================================================
     ASSEMBLE
     ===================================================================== */
  const FG_W = 1900;
  TH.renderStreet = function (archSvg, lightsSvg, fgSvg) {
    LIGHTS = [];
    let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <pattern id="clap" width="40" height="10" patternUnits="userSpaceOnUse">
        <rect y="8.6" width="40" height="1.4" fill="rgba(40,25,15,.16)"/><rect y="0" width="40" height="1" fill="rgba(255,255,255,.10)"/>
      </pattern>
      <pattern id="bricks" width="26" height="13" patternUnits="userSpaceOnUse">
        <rect y="5.8" width="26" height="1.2" fill="rgba(235,220,195,.35)"/><rect y="12" width="26" height="1.2" fill="rgba(235,220,195,.35)"/>
        <rect x="0" y="0" width="1.2" height="6" fill="rgba(235,220,195,.35)"/><rect x="13" y="6.5" width="1.2" height="6" fill="rgba(235,220,195,.35)"/>
        <rect x="3" y="1.5" width="8" height="3" fill="rgba(80,30,20,.10)"/><rect x="16" y="8" width="7" height="3" fill="rgba(255,230,200,.07)"/>
      </pattern>
      <pattern id="shingle" width="12" height="8" patternUnits="userSpaceOnUse">
        <path d="M0,8 q6,-6 12,0" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1"/>
      </pattern>
      <pattern id="planks" width="22" height="${WALK_H}" patternUnits="userSpaceOnUse">
        <rect width="1.5" height="${WALK_H}" fill="rgba(40,25,15,.25)"/>
      </pattern>
      <pattern id="pavers" width="44" height="22" patternUnits="userSpaceOnUse">
        <path d="M0,0.5 H44 M0,11.5 H44 M0.5,0 V11 M22.5,11 V22" stroke="rgba(70,50,35,.14)" stroke-width="1" fill="none"/>
      </pattern>
      <linearGradient id="porchShade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1e140c" stop-opacity=".38"/><stop offset="1" stop-color="#1e140c" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="streetFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3a2a1c" stop-opacity=".18"/><stop offset=".4" stop-color="#3a2a1c" stop-opacity="0"/>
      </linearGradient>
    </defs>`;

    /* --- gateway panel --- */
    s += `<g class="gateway">${perspectiveStreet()}</g>`;

    /* --- elevation street --- */
    const x0 = GATE_W - 120;
    // ground: boardwalk + street
    s += rect(x0, BASE, W - x0, WALK_H, 'fill="#9c7c5a"');
    s += rect(x0, BASE, W - x0, WALK_H, 'fill="url(#planks)"');
    s += rect(x0, BASE + WALK_H - 3, W - x0, 3, `fill="${WOOD_DK}"`);
    s += rect(x0, BASE + WALK_H, W - x0, H - BASE - WALK_H, 'class="street"');
    s += rect(x0, BASE + WALK_H, W - x0, H - BASE - WALK_H, 'fill="url(#pavers)"');
    s += rect(x0, BASE + WALK_H, W - x0, H - BASE - WALK_H, 'fill="url(#streetFade)"');
    // blend the seam between the perspective road and the elevation street
    s += rect(GATE_W - 150, 620, 300, 100, 'class="street"');

    s += waterTower(4390);
    s += waterTower(6600);

    const seq = [
      ['hotel', 460, { color: '#e3d6b8', sign: 'HOTEL', flowers: true, flowerColor: '#c8423b' }],
      ['ff', 300, { color: '#8e9f8a', parapet: 'stepped', sign: 'FEED & SEED' }],
      ['tree', 140],
      ['brick', 420, { color: '#9a4a36', plaque: 'MERCANTILE', awning: ['#2f5a4a', '#e9e1cc'], flowers: true, flowerColor: '#f2efe4' }],
      ['ff', 280, { color: '#b86f52', parapet: 'peak', sign: 'SADDLERY' }],
      ['mission', 360, { color: '#e6d7bc', sign: 'MERCADO' }],
      ['ff', 320, { color: '#7e8c93', stories: 2, sign: 'DRY GOODS', flowers: true, flowerColor: '#e7a1a6', balcony: false }],
      ['brick', 300, { color: '#a5583f', stories: 1, parapet: 'stepped', plaque: 'BANK', awning: ['#6b2d45', '#efe4d4'] }],
      ['tree', 160],
      ['hotel', 440, { color: '#c99a5b', sign: 'BOARDING HOUSE', flowers: true, flowerColor: '#e7a1a6', signColor: '#efe6d2', signInk: '#4a3426' }],
      ['ff', 300, { color: '#d8cdb6', parapet: 'stepped', sign: 'BARBER' }],
      ['brick', 380, { color: '#8f4634', plaque: 'ODD FELLOWS HALL', awning: ['#c8902e', '#f2e6cc'], flowers: true, flowerColor: '#c8423b' }],
      ['ff', 280, { color: '#8e9f8a', parapet: 'peak', stories: 2, sign: 'GENERAL STORE', flowers: true }],
      ['tree', 200],
      ['mission', 320, { color: '#eadbc0', sign: '' }]
    ];
    let x = GATE_W;
    let seed = 3;
    seq.forEach(([type, w, o]) => {
      if (type === 'hotel') s += hotel(x, w, o);
      else if (type === 'ff') s += falseFront(x, w, o);
      else if (type === 'brick') s += brick(x, w, o);
      else if (type === 'mission') s += mission(x, w, o);
      else if (type === 'tree') s += tree(x - 30, w + 60, seed++ * 17);
      x += w;
    });
    // end of the street: open lot with oaks
    s += tree(x + 60, 260, 91, { top: 150 });
    s += tree(x + 360, 220, 92, { top: 175 });

    // boardwalk props in the gaps between stalls
    TH.STREET.slots.forEach((slot, i) => {
      const gx = slot.x + SLOT_GAP / 2;
      if (i % 3 === 0) s += planter(gx - 40, ['#c8423b', '#e7a1a6', '#f2c14e'][i % 3]);
      if (i % 4 === 1) s += bench(gx - 60);
      if (i === 6) s += wagonWheel(gx + 40, BASE - 30, 30);
    });
    s += planter(SLOT_START - 200, '#c8423b');

    // lamp posts between stalls, with festoon lights strung between them
    const lamps = [SLOT_START - SLOT_GAP / 2];
    TH.STREET.slots.forEach((slot) => lamps.push(slot.x + SLOT_GAP / 2));
    lamps.forEach((lx, i) => {
      s += lampPost(lx);
      if (i < lamps.length - 1) s += stringLights(lx, 340, lamps[i + 1], 340, 30, 14);
    });

    // end-of-market signpost
    const ex = W - 330;
    s += rect(ex, 440, 8, 266, `fill="${WOOD_DK}"`);
    s += rect(ex - 110, 460, 230, 76, `rx="4" fill="${WOOD_LT}"`);
    s += rect(ex - 104, 466, 218, 64, `rx="3" fill="#efe3c8"`);
    s += `<text x="${ex + 5}" y="493" text-anchor="middle" class="sign-paint" font-size="17" fill="#3b2f25">End of today's market</text>`;
    s += `<text x="${ex + 5}" y="516" text-anchor="middle" class="sign-small" font-size="10" fill="#6b4a32" letter-spacing="1.6">EVERY BUSINESS IS IN THE DIRECTORY</text>`;

    s += '</svg>';
    archSvg.innerHTML = s;

    /* --- foreground: the arch and the seam tree sit above the evening lights --- */
    let fg = `<svg viewBox="0 0 ${FG_W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`;
    // seam: large pepper tree + wooden way-sign
    fg += tree(GATE_W - 150, 280, 55, { top: 120 });
    fg += rect(GATE_W + 96, 470, 8, 236, `fill="${WOOD_DK}"`);
    fg += poly([[GATE_W + 40, 520], [GATE_W + 190, 520], [GATE_W + 210, 540], [GATE_W + 190, 560], [GATE_W + 40, 560]], `fill="${WOOD_LT}"`);
    fg += `<text x="${GATE_W + 118}" y="547" text-anchor="middle" class="sign-paint" font-size="17" fill="#3b2f25">Front Street →</text>`;

    fg += gatewayArch();
    fgSvg.innerHTML = fg + '</svg>';
    fgSvg.style.width = (FG_W / W) * 100 + '%';
    fgSvg.style.right = 'auto';

    lightsSvg.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs><radialGradient id="halo"><stop offset="0" stop-color="#ffd27a" stop-opacity=".75"/><stop offset=".35" stop-color="#ffb24a" stop-opacity=".25"/><stop offset="1" stop-color="#ff9a3a" stop-opacity="0"/></radialGradient></defs>
      ${LIGHTS.join('')}</svg>`;
  };
})();
