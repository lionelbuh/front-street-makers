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

  const H = 820; // 720 for the street + a 100-unit promenade in front of the stalls
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
    let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <defs><radialGradient id="sunGlow"><stop offset="0" stop-color="#fff6d8" stop-opacity=".9"/><stop offset=".3" stop-color="#fff1c4" stop-opacity=".35"/><stop offset="1" stop-color="#fff1c4" stop-opacity="0"/></radialGradient></defs>`;
    // stars (evening only)
    for (let i = 0; i < 90; i++) s += circ(r() * W, r() * 230, r() * 1.4 + 0.4, 'class="star"');
    // the afternoon sun (daytime only)
    s += `<circle cx="1560" cy="70" r="150" fill="url(#sunGlow)" class="sun"/><circle cx="1560" cy="70" r="26" class="sun sun-disc"/>`;
    // a few thin fair-weather clouds
    for (let i = 0; i < 5; i++) {
      const cx = 700 + i * 1300 + r() * 300, cy = 60 + r() * 70;
      s += `<g class="cloud">${ell(cx, cy, 70, 10)}${ell(cx - 34, cy - 5, 34, 9)}${ell(cx + 26, cy - 7, 40, 11)}</g>`;
    }
    s += `<path class="mtn-far" d="${ridgePath(ridge(r, 300, 34, 24, W))}"/>`;
    s += `<path class="mtn" d="${ridgePath(ridge(r, 330, 28, 20, W))}"/>`;
    // hot-air balloons: a Temecula Valley signature
    s += balloon(430, 110, 0.75, '#c8573f', '#e9c46a');
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

  function storefront(x, w, top, color, trim = TRIM) {
    // display windows either side of a recessed door, with kickplates
    const dw = 42;
    const dx = x + w / 2 - dw / 2;
    let s = rect(x + 6, top, w - 12, BASE - top, `fill="${shade(color, -0.08)}"`);
    s += rect(x + 6, top, w - 12, 18, `fill="${trim}"`); // transom bar
    const gl = [[x + 16, dx - 10], [dx + dw + 10, x + w - 16]];
    gl.forEach(([a, b]) => {
      if (b - a < 20) return;
      s += rect(a - 3, top + 22, b - a + 6, BASE - top - 44, `fill="${trim}"`);
      s += rect(a, top + 25, b - a, BASE - top - 52, 'class="glass"');
      LIGHTS.push(rect(a, top + 25, b - a, BASE - top - 52, 'class="lit"'));
      const m = Math.max(1, Math.round((b - a) / 40));
      for (let i = 1; i < m; i++) s += rect(a + ((b - a) / m) * i - 1.5, top + 25, 3, BASE - top - 52, `fill="${trim}"`);
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
    if (o.sign) s += signBand(x + w * 0.12, signY, w * 0.76, 34, o.sign, o.signColor || TRIM, o.signInk || '#3b2f25');
    else s += rect(x + w * 0.1, signY + 12, w * 0.8, 6, `fill="${o.trim || TRIM}"`);
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

  /* ---------------------------------------------------------------------
     OLD TOWN LANDMARKS
     Interpretations of historic buildings listed by the City of Temecula
     (temeculaca.gov "Historical Places" and its photo gallery). Only the
     historic building names are used; no current businesses are shown.
     They are grouped together for the illustration and are not in their
     real order along the street.
     --------------------------------------------------------------------- */
  function plaque(cx, y, text, o = {}) {
    const fs = o.fs || 10;
    const w = text.length * fs * 0.66 + 20;
    let s = rect(cx - w / 2, y, w, fs + 11, `rx="2" fill="${o.bg || '#3d3128'}"`);
    if (o.border) s += rect(cx - w / 2 + 2.5, y + 2.5, w - 5, fs + 6, `rx="1.5" fill="none" stroke="${o.ink || '#efe3c8'}" stroke-opacity=".5"`);
    s += `<text x="${n(cx)}" y="${n(y + fs + 2.5)}" text-anchor="middle" font-size="${fs}" class="sign-small" fill="${o.ink || '#efe3c8'}" letter-spacing="1.3">${text}</text>`;
    return s;
  }

  function shrubs(x, w, seed) {
    const r = rng(seed);
    let s = '';
    for (let i = 0; i < w / 14; i++) {
      const sx = x + i * 14 + r() * 6;
      s += ell(sx, BASE - 6 - r() * 8, 14 + r() * 8, 12 + r() * 6, `fill="${['#56743f', '#66864a', '#4b6838'][i % 3]}"`);
      if (r() > 0.45) s += circ(sx + r() * 8 - 4, BASE - 16 - r() * 8, 3, `fill="${['#e86f8a', '#f4efe4', '#d9415a'][i % 3]}"`);
    }
    return s;
  }

  function barrel(cx) {
    let s = `<path d="M${cx - 12},${BASE} Q${cx - 15},${BASE - 17} ${cx - 12},${BASE - 34} L${cx + 12},${BASE - 34} Q${cx + 15},${BASE - 17} ${cx + 12},${BASE} Z" fill="#8a6142"/>`;
    s += rect(cx - 13, BASE - 29, 26, 3, 'fill="#3a3632"') + rect(cx - 13, BASE - 8, 26, 3, 'fill="#3a3632"');
    s += rect(cx - 3, BASE - 34, 1.4, 34, 'fill="rgba(0,0,0,.2)"') + rect(cx + 5, BASE - 34, 1.4, 34, 'fill="rgba(0,0,0,.2)"');
    return s;
  }

  // Hotel Temecula (Welty Hotel): long two-storey white clapboard building,
  // dark green trim, full-width two-level veranda, low hipped roof.
  function hotelTemecula(x, w) {
    const top = BASE - 252, wall = '#f5f2ea', trim = '#3f6b5a';
    let s = '';
    const roof = [[x - 16, top + 6], [x + 54, top - 40], [x + w - 54, top - 40], [x + w + 16, top + 6]];
    s += poly(roof, 'fill="#aaa499"') + poly(roof, 'fill="url(#shingle)"');
    [0.2, 0.74].forEach((f) => (s += rect(x + w * f, top - 64, 18, 36, 'fill="#9c5a42"') + rect(x + w * f - 3, top - 68, 24, 6, 'fill="#7a4433"')));
    s += rect(x, top, w, BASE - top, `fill="${wall}"`) + rect(x, top, w, BASE - top, 'fill="url(#clap)"');
    s += rect(x - 10, top - 2, w + 20, 10, `fill="${wall}"`) + rect(x - 10, top + 8, w + 20, 4, 'fill="rgba(0,0,0,.14)"');
    const nU = Math.max(5, Math.round(w / 78));
    for (let i = 0; i < nU; i++) {
      const wx = x + (w / nU) * (i + 0.5) - 15;
      if (i % 3 === 1) s += door(wx - 2, top + 42, 34, 72, trim);
      else s += win(wx, top + 48, 30, 58, { trim });
    }
    for (let i = 0; i < nU; i++) {
      const wx = x + (w / nU) * (i + 0.5) - 15;
      if (i === Math.floor(nU / 2)) s += door(wx - 4, BASE - 104, 38, 104, trim);
      else s += win(wx, BASE - 98, 30, 72, { trim });
    }
    s += porch(x, w, BASE - 128, { balcony: true, roof: '#aaa499', post: trim, fascia: wall });
    const c = Math.max(2, Math.round(w / 115) + 1);
    for (let i = 0; i < c; i++) {
      const px = x - 3 + ((w - 2) / (c - 1)) * i;
      s += rect(px, top + 12, 7, BASE - 128 - 9 - top - 12, `fill="${trim}"`);
    }
    s += plaque(x + w / 2, top + 13, 'HOTEL TEMECULA', { bg: wall, ink: trim, fs: 12, border: true });
    s += shrubs(x + 8, w - 16, Math.round(x));
    return s;
  }

  // The Mercantile Building (1891): red brick, one storey, raised centre
  // parapet with a painted sign panel, wooden porch with white brackets.
  function mercantile(x, w) {
    const brickC = '#9e4a32', top = BASE - 196;
    const cL = x + w * 0.27, cR = x + w * 0.73, cTop = BASE - 292;
    const d = `M${x},${BASE} V${top} H${n(cL)} V${cTop + 28} Q${n((cL + cR) / 2)},${cTop - 14} ${n(cR)},${cTop + 28} V${top} H${x + w} V${BASE} Z`;
    let s = `<path d="${d}" fill="${brickC}"/><path d="${d}" fill="url(#bricks)"/>`;
    s += `<path d="M${x - 3},${top} H${n(cL)} V${cTop + 28} Q${n((cL + cR) / 2)},${cTop - 14} ${n(cR)},${cTop + 28} V${top} H${x + w + 3}" fill="none" stroke="#b9603f" stroke-width="7"/>`;
    [x, cL - 6, cR - 6, x + w - 12].forEach((px) => (s += rect(px, (px === x || px === x + w - 12 ? top : cTop + 22) - 10, 12, 12, 'fill="#b9603f"')));
    for (let bx = x + 6; bx < x + w - 6; bx += 13) s += rect(bx, top + 10, 8, 7, 'fill="rgba(60,20,10,.25)"');
    // sign panel
    s += rect(cL + 18, cTop + 26, cR - cL - 36, top - cTop - 18, 'rx="5" fill="#efe8d6" stroke="#6e3423" stroke-width="2"');
    const mid = (cL + cR) / 2;
    s += `<text x="${n(mid)}" y="${cTop + 45}" text-anchor="middle" font-size="11" class="sign-small" fill="#6e3423" letter-spacing="2">TEMECULA</text>`;
    s += `<text x="${n(mid)}" y="${cTop + 69}" text-anchor="middle" font-size="19" class="sign-paint" fill="#3b2a22">MERCANTILE</text>`;
    s += `<text x="${n(mid)}" y="${cTop + 84}" text-anchor="middle" font-size="7.6" class="sign-small" fill="#6e3423" letter-spacing="1.4">GENERAL MERCHANDISE</text>`;
    s += storefront(x + 8, w - 16, BASE - 140, '#6e5440', '#8a6a4a');
    // shingled porch roof, natural wood posts, white scroll brackets
    const py = BASE - 146;
    s += rect(x - 14, py - 20, w + 28, 22, 'fill="#6e5440"') + rect(x - 14, py - 20, w + 28, 22, 'fill="url(#shingle)"');
    s += porch(x, w, py, { roof: '#5d4636', post: '#8a6a4a', fascia: '#8a6a4a' });
    const c = Math.max(2, Math.round(w / 115) + 1);
    for (let i = 0; i < c; i++) {
      const px = x - 3 + ((w - 2) / (c - 1)) * i;
      if (i < c - 1) s += `<path d="M${n(px + 7)},${py + 46} Q${n(px + 9)},${py + 16} ${n(px + 36)},${py + 11}" stroke="#f2ede2" stroke-width="4" fill="none"/>`;
      if (i > 0) s += `<path d="M${n(px)},${py + 46} Q${n(px - 2)},${py + 16} ${n(px - 29)},${py + 11}" stroke="#f2ede2" stroke-width="4" fill="none"/>`;
    }
    s += barrel(x + 30) + barrel(x + w - 34);
    return s;
  }

  // Tall board-and-batten barn building (generic Old Town infill, no signage)
  function barnBoard(x, w) {
    const top = BASE - 286;
    let s = rect(x, top, w, BASE - top, 'fill="#74503a"');
    for (let bx = x + 8; bx < x + w; bx += 12) s += rect(bx, top, 2.4, BASE - top, 'fill="rgba(0,0,0,.22)"');
    s += rect(x - 6, top - 10, w + 12, 12, 'fill="#5a3e2c"');
    s += rect(x + w / 2 - 24, top + 34, 48, 58, 'fill="#5a3e2c"') + `<path d="M${x + w / 2 - 24},${top + 34} l48,58 M${x + w / 2 + 24},${top + 34} l-48,58" stroke="#8a6142" stroke-width="3"/>`;
    s += rect(x + w / 2 - 4, top + 14, 8, 20, `fill="${IRON}"`);
    s += storefront(x + 6, w - 12, BASE - 120, '#5a3e2c', '#a07a55');
    s += porch(x, w, BASE - 128, { roof: '#6d6256' });
    return s;
  }

  // A cross street opening (Main Street meets Front Street)
  function crossStreet(x, w, name) {
    let s = '';
    s += rect(x, BASE - 92, w, 92, 'class="haze-far"');
    s += rect(x + 14, BASE - 70, w * 0.32, 56, 'fill="#ddd2bb"') + rect(x + 14, BASE - 74, w * 0.32, 6, 'fill="#efe6d2"');
    s += rect(x + w * 0.58, BASE - 60, w * 0.3, 46, 'fill="#b78968"');
    s += ell(x + w * 0.5, BASE - 64, 26, 22, 'fill="#6e8a50"');
    s += rect(x, BASE - 16, w, 16 + WALK_H + 2, 'class="road"');
    s += rect(x, BASE + WALK_H - 2, w, 3, 'fill="rgba(0,0,0,.12)"');
    // corner street sign
    const px = x + w - 26;
    s += rect(px - 3, BASE - 196, 6, 196 + WALK_H, 'fill="#5c5f60"');
    s += rect(px - 46, BASE - 196, 92, 22, 'rx="3" fill="#2f6b45"');
    s += rect(px - 43, BASE - 193, 86, 16, 'rx="2" fill="none" stroke="#f4f1e8" stroke-width="1.4"');
    s += `<text x="${px}" y="${BASE - 180}" text-anchor="middle" font-size="12" class="sign-small" fill="#f4f1e8" letter-spacing="1.5">${name}</text>`;
    s += rect(px - 4, BASE - 172, 8, 18, 'fill="#2f6b45"');
    return s;
  }

  // 1st National Bank of Temecula (1914): two-storey poured-concrete block,
  // pale yellow with cream cornice and belt course, tall ochre-framed windows.
  function bank1914(x, w) {
    const wall = '#eedca4', trim = '#f7eed3', frame = '#a8733a', top = BASE - 262;
    let s = rect(x, top, w, BASE - top, `fill="${wall}"`);
    const r = rng(Math.round(x));
    for (let i = 0; i < 22; i++) s += ell(x + r() * w, top + r() * (BASE - top), 14 + r() * 22, 4 + r() * 6, 'fill="rgba(140,110,60,.06)"');
    s += rect(x, top, 16, BASE - top, `fill="${shade(wall, 0.25)}"`) + rect(x + w - 16, top, 16, BASE - top, `fill="${shade(wall, -0.07)}"`);
    s += rect(x - 12, top - 22, w + 24, 15, `fill="${trim}"`) + rect(x - 12, top - 7, w + 24, 5, 'fill="rgba(0,0,0,.16)"');
    s += rect(x - 7, top - 29, w + 14, 8, `fill="${trim}"`);
    for (let bx = x + 4; bx < x + w - 4; bx += 12) s += rect(bx, top - 2, 6, 7, `fill="${trim}"`);
    s += rect(x, top + 12, w, 8, `fill="${trim}"`);
    s += rect(x - 5, BASE - 140, w + 10, 11, `fill="${trim}"`) + rect(x - 5, BASE - 129, w + 10, 3, 'fill="rgba(0,0,0,.12)"');
    const nU = Math.max(4, Math.round(w / 74));
    for (let i = 0; i < nU; i++) s += win(x + 22 + ((w - 44) / nU) * (i + 0.5) - 15, top + 56, 30, 66, { trim: frame });
    s += storefront(x + 18, w - 36, BASE - 118, '#8a5a2e', frame);
    s += plaque(x + w / 2, top + 21, 'FIRST NATIONAL BANK · 1914', { bg: frame, ink: '#fbf3dc', fs: 10 });
    return s;
  }

  // Welty Store: two-storey cream false front with a stepped top and a deep
  // covered porch over the boardwalk.
  function weltyStore(x, w) {
    const wall = '#ede5d3', trim = '#5b4a3a', top = BASE - 250;
    const outline = [[x, top], [x + w * 0.3, top], [x + w * 0.3, top - 16], [x + w * 0.4, top - 16], [x + w * 0.4, top - 34], [x + w * 0.6, top - 34], [x + w * 0.6, top - 16], [x + w * 0.7, top - 16], [x + w * 0.7, top], [x + w, top]];
    const pts = [[x, BASE], ...outline, [x + w, BASE]];
    let s = poly(pts, `fill="${wall}"`) + poly(pts, 'fill="url(#clap)"');
    s += `<polyline points="${outline.map((p) => n(p[0]) + ',' + n(p[1])).join(' ')}" fill="none" stroke="${trim}" stroke-width="6"/>`;
    s += rect(x + w * 0.45, top - 26, w * 0.1, 16, `fill="none" stroke="${trim}" stroke-width="2"`);
    s += rect(x, top + 2, 8, BASE - top, `fill="${shade(wall, 0.3)}"`);
    const nU = Math.max(3, Math.round(w / 95));
    for (let i = 0; i < nU; i++) s += win(x + (w / nU) * (i + 0.5) - 16, top + 50, 32, 70, { trim: '#7a5a40', flowers: true, flowerColor: '#d9415a' });
    s += plaque(x + w / 2, top + 14, 'WELTY STORE', { bg: wall, ink: trim, fs: 11, border: true });
    s += storefront(x + 6, w - 12, BASE - 128, '#7a5a40', '#e9e0cc');
    s += porch(x, w, BASE - 138, { roof: '#6d6256', post: '#8a6a4a', fascia: '#8a6a4a' });
    const c = Math.max(2, Math.round(w / 115) + 1);
    for (let i = 1; i < c - 1; i++) {
      const px = x - 3 + ((w - 2) / (c - 1)) * i + 3;
      s += line(px, BASE - 127, px, BASE - 112, 'stroke="#3a3632" stroke-width="1"');
      s += `<path d="M${n(px - 11)},${BASE - 112} q11,12 22,0 Z" fill="#7a5638"/>`;
      for (let k = 0; k < 6; k++) s += circ(px - 10 + k * 4, BASE - 114 - (k % 2) * 3, 3, `fill="${k % 2 ? '#5f7f46' : '#e86f8a'}"`);
      s += `<path d="M${n(px - 6)},${BASE - 106} q-3,10 1,18 M${n(px + 6)},${BASE - 106} q3,10 -1,16" stroke="#5f7f46" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    }
    return s;
  }

  // Machado Store: low white stucco building under a brown hipped roof,
  // with a board-and-batten barn wing.
  function machadoStore(x, w) {
    const wall = '#f4f1eb', top = BASE - 122, bw = w * 0.26;
    let s = poly([[x, BASE], [x, top - 8], [x + bw / 2, top - 56], [x + bw, top - 8], [x + bw, BASE]], 'fill="#7a5236"');
    for (let bx = x + 6; bx < x + bw; bx += 11) s += rect(bx, top - 50, 2, BASE - top + 50, 'fill="rgba(0,0,0,.2)"');
    s += poly([[x - 6, top - 6], [x + bw / 2, top - 60], [x + bw + 6, top - 6], [x + bw + 6, top], [x + bw / 2, top - 54], [x - 6, top]], 'fill="#5a3e2c"');
    s += rect(x + bw * 0.16, BASE - 100, bw * 0.68, 100, 'fill="#5e3d28"');
    s += `<path d="M${n(x + bw * 0.16)},${BASE - 100} l${n(bw * 0.34)},100 M${n(x + bw * 0.5)},${BASE - 100} l${n(-bw * 0.34)},100 M${n(x + bw * 0.5)},${BASE - 100} l${n(bw * 0.34)},100 M${n(x + bw * 0.84)},${BASE - 100} l${n(-bw * 0.34)},100" stroke="#8a6142" stroke-width="3"/>`;
    s += rect(x + bw * 0.5 - 1, BASE - 100, 2, 100, 'fill="#3a2a1e"');
    const roof = [[x + bw - 6, top + 4], [x + bw + 44, top - 46], [x + w - 44, top - 46], [x + w + 12, top + 4]];
    s += poly(roof, 'fill="#7c5a46"') + poly(roof, 'fill="url(#shingle)"');
    s += rect(x + bw, top, w - bw, BASE - top, `fill="${wall}"`);
    const r = rng(Math.round(x));
    for (let i = 0; i < 16; i++) s += ell(x + bw + r() * (w - bw), top + r() * (BASE - top), 12 + r() * 18, 4 + r() * 5, 'fill="rgba(120,100,80,.06)"');
    s += rect(x + bw - 6, top, w - bw + 18, 12, 'fill="rgba(0,0,0,.16)"');
    const nW = 3;
    for (let i = 0; i < nW; i++) s += win(x + bw + ((w - bw) / (nW + 1)) * (i + 1) - 15 + (i === 1 ? 30 : 0), BASE - 92, 30, 46, { trim: '#f9f7f2' });
    s += door(x + bw + (w - bw) / 2 - 18, BASE - 96, 34, 96, '#6e4a34');
    s += plaque(x + bw + (w - bw) / 2, top + 14, 'MACHADO STORE', { bg: '#6e4a34', ink: '#f4f1eb', fs: 10 });
    s += barrel(x + bw + 24) + barrel(x + w - 30) + barrel(x + w - 58);
    return s;
  }

  // Brick building with a clock tower (generic; unnamed)
  function clockTower(x, w) {
    const brickC = '#a65a3d', top = BASE - 232, tw = 96, tx = x + w / 2 - tw / 2, tTop = BASE - 404;
    let s = rect(tx, tTop, tw, top - tTop + 10, `fill="${brickC}"`) + rect(tx, tTop, tw, top - tTop + 10, 'fill="url(#bricks)"');
    s += rect(tx - 6, tTop - 6, tw + 12, 10, 'fill="#e9dcc0"');
    s += circ(tx + tw / 2, tTop + 52, 28, 'fill="#e9dcc0"') + circ(tx + tw / 2, tTop + 52, 23, 'fill="#f8f4ea" stroke="#3a3632" stroke-width="2"');
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      s += line(tx + tw / 2 + Math.cos(a) * 18, tTop + 52 + Math.sin(a) * 18, tx + tw / 2 + Math.cos(a) * 21, tTop + 52 + Math.sin(a) * 21, 'stroke="#3a3632" stroke-width="1.6"');
    }
    s += line(tx + tw / 2, tTop + 52, tx + tw / 2, tTop + 38, 'stroke="#3a3632" stroke-width="2.4"') + line(tx + tw / 2, tTop + 52, tx + tw / 2 + 11, tTop + 56, 'stroke="#3a3632" stroke-width="2.4"');
    s += win(tx + tw / 2 - 14, tTop + 96, 28, 50, { arch: true, trim: '#e9dcc0' });
    const roof = [[tx - 12, tTop - 6], [tx + tw + 12, tTop - 6], [tx + tw / 2, tTop - 78]];
    s += poly(roof, 'fill="#8b7c6a"') + poly(roof, 'fill="url(#shingle)"') + poly([[tx + tw / 2, tTop - 6], [tx + tw + 12, tTop - 6], [tx + tw / 2, tTop - 78]], 'fill="rgba(0,0,0,.15)"');
    s += line(tx + tw / 2, tTop - 78, tx + tw / 2, tTop - 104, `stroke="${IRON}" stroke-width="2"`);
    s += `<path d="M${tx + tw / 2 - 14},${tTop - 96} h28 l-6,-4 M${tx + tw / 2 - 14},${tTop - 96} l4,4" stroke="${IRON}" stroke-width="2" fill="none"/>`;
    s += rect(x, top, w, BASE - top, `fill="${brickC}"`) + rect(x, top, w, BASE - top, 'fill="url(#bricks)"');
    s += rect(x - 8, top - 10, w + 16, 12, 'fill="#e9dcc0"');
    for (let bx = x; bx < x + w; bx += 14) s += rect(bx, top + 2, 8, 7, 'fill="rgba(60,20,10,.22)"');
    const nU = 4;
    for (let i = 0; i < nU; i++) {
      const wx = x + (w / nU) * (i + 0.5) - 15;
      if (Math.abs(wx + 15 - (x + w / 2)) < 50) continue;
      s += win(wx, top + 34, 30, 70, { arch: true, trim: '#e9dcc0', flowers: true, flowerColor: '#f4efe4' });
    }
    s += storefront(x + 10, w - 20, BASE - 126, '#4b3b30');
    s += canvasAwning(x + 14, BASE - 134, w - 28, ['#2f5a4a', '#ece4cf']);
    return s;
  }

  /* ---------------------------------------------------------------------
     More Old Town building types, drawn from reference photos supplied by
     the project owner (used as visual reference only). Unnamed except the
     Community Theater, a public civic building.
     --------------------------------------------------------------------- */
  const WEATHERED = '#7e5b40';
  function boards(x, y, w, h, seed, base = WEATHERED) {
    const r = rng(seed);
    let s = rect(x, y, w, h, `fill="${base}"`);
    for (let bx = x; bx < x + w; bx += 9) {
      const t = r();
      if (t > 0.55) s += rect(bx, y, 9, h, `fill="${t > 0.8 ? 'rgba(255,235,210,.08)' : 'rgba(30,15,5,.10)'}"`);
      s += rect(bx, y, 1.2, h, 'fill="rgba(30,15,5,.28)"');
    }
    return s;
  }

  // Two-storey weathered-wood building: stepped false fronts with a curved
  // centre parapet, green shutters, white two-level balcony.
  function westernBalcony(x, w) {
    const top = BASE - 262;
    const d = `M${x},${BASE} V${top - 14} H${n(x + w * 0.2)} V${top - 26} H${n(x + w * 0.36)} V${top - 34} Q${n(x + w * 0.5)},${top - 92} ${n(x + w * 0.64)},${top - 34} V${top - 26} H${n(x + w * 0.8)} V${top - 14} H${x + w} V${BASE} Z`;
    let s = `<clipPath id="wb${Math.round(x)}"><path d="${d}"/></clipPath>`;
    s += `<g clip-path="url(#wb${Math.round(x)})">${boards(x, top - 100, w, BASE - top + 100, Math.round(x))}</g>`;
    s += `<path d="M${x - 3},${top - 14} H${n(x + w * 0.2)} V${top - 26} H${n(x + w * 0.36)} V${top - 34} Q${n(x + w * 0.5)},${top - 92} ${n(x + w * 0.64)},${top - 34} V${top - 26} H${n(x + w * 0.8)} V${top - 14} H${x + w + 3}" fill="none" stroke="#6f8a7a" stroke-width="6"/>`;
    const nU = Math.max(3, Math.round(w / 95));
    for (let i = 0; i < nU; i++) {
      const wx = x + (w / nU) * (i + 0.5) - 15;
      s += rect(wx - 16, top + 30, 12, 66, 'fill="#4f7a62"') + rect(wx + 34, top + 30, 12, 66, 'fill="#4f7a62"');
      s += win(wx, top + 32, 30, 62, { trim: '#f1ede4' });
    }
    s += storefront(x + 6, w - 12, BASE - 120, '#5a3e2c', '#f1ede4');
    s += porch(x, w, BASE - 128, { balcony: true, roof: '#9a948a', post: '#f1ede4', fascia: '#f1ede4' });
    const c = Math.max(2, Math.round(w / 115) + 1);
    s += rect(x - 10, top + 6, w + 20, 8, 'fill="#9a948a"');
    for (let i = 0; i < c; i++) {
      const px = x - 3 + ((w - 2) / (c - 1)) * i;
      s += rect(px, top + 14, 7, BASE - 128 - 9 - top - 14, 'fill="#f1ede4"');
      if (i > 0) s += poly([[px, top + 14], [px - 16, top + 14], [px, top + 30]], 'fill="#f1ede4"');
      if (i < c - 1) s += poly([[px + 7, top + 14], [px + 23, top + 14], [px + 7, top + 30]], 'fill="#f1ede4"');
    }
    return s;
  }

  // Grey clapboard building with bay windows, a turret, a roof deck and a
  // porch with white railings.
  function victorianGrey(x, w) {
    const wall = '#a8adac', trim = '#f4f2ec', top = BASE - 250;
    const tw = 84, tx = x + w - tw - 6;
    let s = '';
    // roof deck railing + flag
    s += rect(x + 30, top - 64, w * 0.55, 4, `fill="${trim}"`) + rect(x + 30, top - 40, w * 0.55, 3, `fill="${trim}"`);
    for (let bx = x + 32; bx < x + 30 + w * 0.55; bx += 7) s += rect(bx, top - 62, 2.4, 22, `fill="${trim}"`);
    s += line(x + w * 0.5, top - 64, x + w * 0.5, top - 120, 'stroke="#9a9a96" stroke-width="2"');
    s += rect(x + w * 0.5, top - 120, 30, 18, 'fill="#c8423b"');
    for (let k = 0; k < 3; k++) s += rect(x + w * 0.5, top - 116 + k * 6, 30, 2.5, 'fill="#f4f2ec"');
    s += rect(x + w * 0.5, top - 120, 13, 9, 'fill="#2c4f86"');
    const roof = [[x - 12, top + 4], [x + 30, top - 40], [x + w - 60, top - 40], [x + w - 20, top + 4]];
    s += poly(roof, 'fill="#8d8a82"') + poly(roof, 'fill="url(#shingle)"');
    s += rect(x, top, w, BASE - top, `fill="${wall}"`) + rect(x, top, w, BASE - top, 'fill="url(#clap)"');
    // bay windows on the upper floor
    [0.14, 0.42].forEach((f) => {
      const bx = x + w * f;
      s += poly([[bx - 8, top + 30], [bx + 78, top + 30], [bx + 70, top + 16], [bx, top + 16]], 'fill="#7f7c75"');
      s += rect(bx, top + 30, 70, 76, `fill="${shade(wall, 0.12)}"`);
      s += win(bx + 8, top + 42, 24, 52, { trim }) + win(bx + 38, top + 42, 24, 52, { trim });
      s += rect(bx - 4, top + 106, 78, 8, 'fill="#7f7c75"');
    });
    // turret with a conical roof
    s += rect(tx, top - 40, tw, BASE - top + 40, `fill="${shade(wall, 0.06)}"`) + rect(tx, top - 40, tw, BASE - top + 40, 'fill="url(#clap)"');
    s += rect(tx + tw - 20, top - 40, 20, BASE - top + 40, 'fill="rgba(0,0,0,.1)"');
    s += poly([[tx - 8, top - 38], [tx + tw + 8, top - 38], [tx + tw / 2, top - 112]], 'fill="#7d7a72"') + poly([[tx - 8, top - 38], [tx + tw + 8, top - 38], [tx + tw / 2, top - 112]], 'fill="url(#shingle)"');
    s += circ(tx + tw / 2, top - 114, 4, `fill="${IRON}"`);
    s += win(tx + 14, top - 10, 22, 44, { trim }) + win(tx + 48, top - 10, 22, 44, { trim });
    s += win(tx + 14, top + 70, 22, 44, { trim }) + win(tx + 48, top + 70, 22, 44, { trim });
    s += storefront(x + 6, w - 12, BASE - 118, '#6f6d66', trim);
    s += porch(x, w, BASE - 128, { roof: '#8d8a82', post: trim, fascia: trim });
    // white porch railing
    s += rect(x - 6, BASE - 34, w + 12, 4, `fill="${trim}"`);
    for (let bx = x - 4; bx < x + w + 4; bx += 7) s += rect(bx, BASE - 32, 2.4, 30, `fill="${trim}"`);
    s += shrubs(x + 6, w - 12, Math.round(x) + 5);
    return s;
  }

  // The Old Town Temecula Community Theater's tall barn-like gable, with a
  // long weathered-wood row in front: curved parapet with a red TEMECULA
  // banner sign, rust tin porch roof and a river-rock planter wall.
  function theaterRow(x, w) {
    let s = '';
    // theater gable behind
    const gx = x + w * 0.5, gw = w * 0.5, gTop = BASE - 400;
    s += poly([[gx - 10, BASE - 180], [gx - 10, gTop + 70], [gx + gw / 2, gTop], [gx + gw + 10, gTop + 70], [gx + gw + 10, BASE - 180]], 'fill="#e3d7bc"');
    s += `<path d="M${gx - 16},${gTop + 72} L${gx + gw / 2},${gTop - 6} L${gx + gw + 16},${gTop + 72}" stroke="#77736c" stroke-width="10" fill="none"/>`;
    for (let k = 0; k <= 4; k++) s += rect(gx - 10 + (gw + 20) * k / 4 - 4, gTop + 60, 8, 200, 'fill="#77736c"');
    s += rect(gx - 10, gTop + 150, gw + 20, 8, 'fill="#77736c"');
    for (let k = 0; k < 4; k++) {
      const a = gx - 10 + (gw + 20) * k / 4, b = a + (gw + 20) / 4;
      s += `<path d="M${n(a)},${gTop + 154} L${n(b)},${gTop + 260} M${n(b)},${gTop + 154} L${n(a)},${gTop + 260}" stroke="#77736c" stroke-width="6"/>`;
    }
    s += rect(gx + gw / 2 - 70, gTop + 82, 140, 44, 'fill="#5c5a55"');
    s += `<text x="${n(gx + gw / 2)}" y="${gTop + 100}" text-anchor="middle" font-size="8.5" class="sign-small" fill="#f1ede4" letter-spacing="1">OLD TOWN TEMECULA</text>`;
    s += `<text x="${n(gx + gw / 2)}" y="${gTop + 117}" text-anchor="middle" font-size="12" class="sign-paint" fill="#f1ede4">Community Theater</text>`;
    // weathered row in front
    const top = BASE - 196;
    const segs = [[0, 0.22, 14], [0.22, 0.5, 0], [0.5, 0.74, 22], [0.74, 1, 8]];
    segs.forEach(([a, b, up], i) => {
      const sx = x + w * a, sw = w * (b - a);
      if (i === 1) {
        const d = `M${n(sx)},${BASE} V${top - 20} Q${n(sx + sw / 2)},${top - 92} ${n(sx + sw)},${top - 20} V${BASE} Z`;
        s += `<clipPath id="tr${Math.round(x)}"><path d="${d}"/></clipPath><g clip-path="url(#tr${Math.round(x)})">${boards(sx, top - 100, sw, BASE - top + 100, Math.round(x) + i, '#76553b')}</g>`;
        s += `<path d="M${n(sx - 3)},${top - 20} Q${n(sx + sw / 2)},${top - 94} ${n(sx + sw + 3)},${top - 20}" stroke="#5a3e2c" stroke-width="6" fill="none"/>`;
        // red scroll banner sign
        const cx = sx + sw / 2, by = top - 52;
        s += `<path d="M${n(cx - 64)},${by} Q${n(cx)},${by - 16} ${n(cx + 64)},${by} L${n(cx + 72)},${by + 18} L${n(cx + 62)},${by + 34} Q${n(cx)},${by + 20} ${n(cx - 62)},${by + 34} L${n(cx - 72)},${by + 18} Z" fill="#c2412d" stroke="#f1e3c4" stroke-width="2"/>`;
        s += `<text x="${n(cx)}" y="${by + 22}" text-anchor="middle" font-size="18" class="sign-paint" fill="#f6ead0" letter-spacing="1">TEMECULA</text>`;
      } else {
        s += boards(sx, top - up, sw, BASE - top + up, Math.round(x) + i, i % 2 ? '#86634a' : WEATHERED);
        s += rect(sx - 2, top - up - 6, sw + 4, 7, 'fill="#5a3e2c"');
        for (let bx = sx + 4; bx < sx + sw - 4; bx += 11) s += rect(bx, top - up + 2, 5, 5, 'fill="#5a3e2c"');
      }
    });
    s += storefront(x + 6, w - 12, BASE - 128, '#5a3e2c', '#a07a55');
    // rust corrugated tin porch roof
    s += rect(x - 12, BASE - 150, w + 24, 18, 'fill="#9c4a2e"');
    for (let bx = x - 12; bx < x + w + 12; bx += 5) s += rect(bx, BASE - 150, 2, 18, 'fill="rgba(0,0,0,.18)"');
    s += porch(x, w, BASE - 132, { roof: '#7e3a24', post: '#8a6a4a', fascia: '#6b4a34' });
    // river-rock planter wall with roses
    const r = rng(Math.round(x) + 9);
    s += rect(x, BASE - 22, w, 22, 'fill="#8d8577"');
    for (let bx = x + 4; bx < x + w - 4; bx += 9 + r() * 5) s += ell(bx, BASE - 14 + (r() - 0.5) * 8, 5 + r() * 3, 4 + r() * 2, `fill="${['#b5aa95', '#9d927f', '#c4baa5', '#a89a83'][Math.floor(r() * 4)]}"`);
    for (let bx = x + 8; bx < x + w - 8; bx += 16) s += ell(bx, BASE - 28, 10, 8, 'fill="#5f7f46"') + circ(bx + 3, BASE - 31, 2.6, `fill="${r() > 0.5 ? '#f4efe4' : '#e86f8a'}"`);
    return s;
  }

  // Large wooden building with green metal roofs, wraparound balconies, a
  // row of clerestory windows and a clock cupola; red-brick front steps.
  function woodClock(x, w) {
    const top = BASE - 250, green = '#3f7a5e', greenDk = '#2f5f48';
    let s = '';
    // cupola with clock
    const cx = x + w / 2;
    s += boards(cx - 34, top - 168, 68, 80, Math.round(x) + 3, '#8a5a3a');
    s += circ(cx, top - 128, 22, 'fill="#f8f4ea" stroke="#3a3632" stroke-width="2.5"');
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      s += line(cx + Math.cos(a) * 16, top - 128 + Math.sin(a) * 16, cx + Math.cos(a) * 19, top - 128 + Math.sin(a) * 19, 'stroke="#3a3632" stroke-width="1.4"');
    }
    s += line(cx, top - 128, cx, top - 142, 'stroke="#3a3632" stroke-width="2.2"') + line(cx, top - 128, cx + 10, top - 124, 'stroke="#3a3632" stroke-width="2.2"');
    s += poly([[cx - 46, top - 168], [cx + 46, top - 168], [cx + 24, top - 196], [cx - 24, top - 196]], `fill="${green}"`);
    s += rect(cx - 24, top - 204, 48, 8, `fill="${greenDk}"`);
    // upper green hip roof
    s += poly([[x + 20, top - 70], [x + w - 20, top - 70], [x + w - 60, top - 92], [x + 60, top - 92]], `fill="${green}"`);
    // clerestory band of small windows
    s += boards(x + 40, top - 70, w - 80, 46, Math.round(x) + 4, '#8a5a3a');
    for (let wx = x + 52; wx < x + w - 64; wx += 30) s += rect(wx, top - 62, 20, 30, 'fill="#f1ede4"') + rect(wx + 3, top - 59, 14, 24, 'class="glass"');
    // second roof tier
    s += poly([[x - 16, top + 4], [x + w + 16, top + 4], [x + w - 10, top - 26], [x + 10, top - 26]], `fill="${green}"`);
    for (let bx = x; bx < x + w; bx += 8) s += rect(bx, top - 24, 1.4, 28, 'fill="rgba(0,0,0,.12)"');
    // main body
    s += boards(x, top + 4, w, BASE - top - 4, Math.round(x) + 5, '#8a5a3a');
    const nU = Math.max(5, Math.round(w / 70));
    for (let i = 0; i < nU; i++) s += win(x + (w / nU) * (i + 0.5) - 13, top + 34, 26, 58, { trim: '#f1ede4' });
    s += storefront(x + 6, w - 12, BASE - 118, '#5a3e2c', '#f1ede4');
    // wraparound balcony with green roof band
    s += rect(x - 14, BASE - 150, w + 28, 16, `fill="${green}"`);
    s += porch(x, w, BASE - 132, { balcony: true, roof: greenDk, post: '#e9e2d2', fascia: '#e9e2d2' });
    const c = Math.max(2, Math.round(w / 115) + 1);
    for (let i = 0; i < c; i++) {
      const px = x - 3 + ((w - 2) / (c - 1)) * i;
      s += rect(px, top + 6, 7, BASE - 132 - 9 - top - 6, 'fill="#e9e2d2"');
    }
    // red brick steps
    for (let k = 0; k < 3; k++) s += rect(cx - 50 + k * 8, BASE - 8 - k * 7 + 7, 100 - k * 16, 7, `fill="${['#a8533a', '#b65f44', '#c26a4c'][k]}"`);
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
    // faded double yellow centre line
    for (let u = -150; u < 3000; u += 70) {
      [-7, 7].forEach((o) => (s += poly([P(1, u, 0, PLANE + o - 2.5), P(1, u + 44, 0, PLANE + o - 2.5), P(1, u + 44, 0, PLANE + o + 2.5), P(1, u, 0, PLANE + o + 2.5)], 'class="road-line"')));
    }
    [-1, 1].forEach((side) => {
      // concrete curb
      s += poly([P(side, -160, 0, 112), P(side, far, 0, 112), P(side, far, 0, 124), P(side, -160, 0, 124)], 'fill="#cfc8b9"');
      s += poly([P(side, -160, 0, 0), P(side, far, 0, 0), P(side, far, 0, 112), P(side, -160, 0, 112)], 'fill="#9c7c5a"');
      // plank lines
      for (let u = -150; u < 2600; u += 30) s += poly([P(side, u, 0, 0), P(side, u + 3, 0, 0), P(side, u + 3, 0, 120), P(side, u, 0, 120)], 'fill="rgba(60,40,25,.18)"');
    });

    const r = rng(7);
    const palette = ['#c9b48a', '#8e9f8a', '#b86f52', '#d8cdb6', '#7e8c93', '#c99a5b', '#a6553f', '#e3d6b8'];
    const signs = [''];
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

    // street trees along both sidewalks, far to near
    const tr = rng(19);
    [-1, 1].forEach((side) => {
      for (let u = 2600; u >= 40; u -= 330) {
        const uu = u + (side > 0 ? 160 : 0);
        const k = FOCAL / (FOCAL + uu);
        const base = P(side, uu, 0, 100), crown = P(side, uu, 230, 100);
        s += rect(base[0] - 5 * k, crown[1], 10 * k, base[1] - crown[1], 'fill="#6a5442"');
        const greens = ['#5f8046', '#6f9150', '#557540', '#7c9c58'];
        for (let j = 0; j < 9; j++) {
          const a = tr() * Math.PI * 2, rr = tr();
          s += ell(crown[0] + Math.cos(a) * rr * 70 * k, crown[1] - 20 * k + Math.sin(a) * rr * 50 * k, (34 + tr() * 22) * k, (26 + tr() * 16) * k, `fill="${greens[j % 4]}"`);
        }
      }
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

  /* ---------------------------------------------------------------------
     THE GATEWAY ARCH
     Drawn from the photo of the Front Street entrance (Wikimedia Commons,
     "Old_Town_Temecula_Entrance.jpg") and the matching Main Street Bridge
     pillars shown in the City's Multi-use Trails and Bikeways Master Plan:
       - two tall, slightly tapered pillars faced with irregular fieldstone,
         a stone ledge partway up, on a wider footing
       - a rust-brown (weathering steel) capital box on each pillar with a
         framed emblem panel and a pyramid cap with a ball finial
       - a shallow arch of two parallel steel rails springing from the capitals
       - a cut-out frieze of Western figures between the rails (riders,
         cattle, horses, a wagon)
       - a central oval medallion: TEMECULA / EST. 1859
     The figures are redrawn for this illustration; they follow the theme and
     layout of the real frieze, not its exact outlines.
     --------------------------------------------------------------------- */
  const CORTEN = '#6a2722';
  const CORTEN_HI = '#93443a';
  const CORTEN_DK = '#431612';
  const RELIEF = '#d8ccb6';

  const HORSE = 'M10,30 C20,22 45,24 62,24 L70,14 C73,8 78,3 84,4 L86,0 L88,5 L98,15 L96,21 L87,20 C82,24 78,30 76,36 L74,44 L79,57 L83,70 L78,70 L72,58 L66,47 L62,49 L64,70 L59,70 L56,50 L30,48 L26,60 L30,70 L25,70 L19,58 L18,47 L14,51 L12,70 L7,70 L8,48 C4,42 4,34 10,30 Z M10,32 C2,36 -1,48 2,58 L6,50 C6,42 8,38 12,36 Z';
  const RIDER = 'M42,24 C42,14 44,6 50,4 C48,0 52,-4 56,-2 C60,-2 61,3 58,6 L62,7 L58,10 C62,16 62,22 60,28 L66,40 L60,40 L54,30 L46,30 Z M44,-6 L64,-6 L62,-9 L58,-9 C57,-14 51,-14 50,-9 L46,-9 Z';
  const LASSO = 'M60,6 C70,-2 80,-12 92,-14 C104,-16 108,-6 100,0 C92,6 80,2 84,-6';
  const STEER = 'M12,22 C18,14 52,12 66,16 C70,14 74,16 76,20 L82,20 C86,20 90,24 92,30 L94,37 L88,40 L82,35 L78,37 L76,44 L77,60 L72,60 L69,46 L62,44 L30,44 L27,48 L28,60 L23,60 L21,46 L16,48 L16,60 L11,60 L11,42 C6,38 6,28 12,22 Z M81,21 C88,13 99,10 108,13 C99,14 91,18 85,24 Z M79,21 C73,14 63,12 56,15 C63,15 70,18 76,23 Z M12,24 C4,28 3,38 5,48 L8,42 C8,34 10,30 14,28 Z';
  const WAGON = 'M6,32 C6,10 16,4 26,4 L66,4 C76,4 86,10 86,32 Z M0,32 H92 V42 H0 Z M92,38 L108,42 L108,45 L92,42 Z';

  function silhouette(kind, x, y, ang, s, flip) {
    const foot = kind === 'steer' || kind === 'wagon' ? 62 : 70;
    const w = kind === 'wagon' ? 108 : 100;
    let inner = '';
    if (kind === 'horse') inner = `<path d="${HORSE}"/>`;
    if (kind === 'rider') inner = `<path d="${HORSE}"/><path d="${RIDER}"/>`;
    if (kind === 'roper') inner = `<path d="${HORSE}"/><path d="${RIDER}"/><path d="${LASSO}" fill="none" stroke="${CORTEN}" stroke-width="3"/>`;
    if (kind === 'steer') inner = `<path d="${STEER}"/>`;
    if (kind === 'wagon') {
      inner = `<path d="${WAGON}"/>`;
      [18, 74].forEach((cx) => {
        inner += `<circle cx="${cx}" cy="52" r="10" fill="none" stroke="${CORTEN}" stroke-width="4"/>`;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI;
          inner += line(cx - Math.cos(a) * 10, 52 - Math.sin(a) * 10, cx + Math.cos(a) * 10, 52 + Math.sin(a) * 10, `stroke="${CORTEN}" stroke-width="2"`);
        }
      });
    }
    return `<g transform="translate(${n(x)},${n(y)}) rotate(${n(ang)}) scale(${flip ? -s : s},${s}) translate(${-w / 2},${-foot})" fill="${CORTEN}">${inner}</g>`;
  }

  function fieldstonePillar(cx, yTop, yBot, wTop, wBot, seed) {
    const r = rng(seed);
    const id = 'pillar' + seed;
    const pts = [[cx - wBot / 2, yBot], [cx - wTop / 2, yTop], [cx + wTop / 2, yTop], [cx + wBot / 2, yBot]];
    let s = `<clipPath id="${id}">${poly(pts)}</clipPath>`;
    s += poly(pts, 'fill="#6c6558"'); // mortar
    s += `<g clip-path="url(#${id})">`;
    const tones = ['#a39a8a', '#b8ad98', '#8e8676', '#c4b9a3', '#9a8f7c', '#ab9f88', '#7f786c', '#b3a58c', '#cfc4ad', '#a8907a'];
    let y = yTop - 6;
    while (y < yBot) {
      const rh = 13 + r() * 17;
      let x = cx - wBot / 2 - 8 - r() * 12;
      while (x < cx + wBot / 2 + 8) {
        const rw = 15 + r() * 28;
        const j = () => (r() - 0.5) * 6;
        s += poly([[x + 1.5 + j(), y + 1.5 + j()], [x + rw * 0.5, y + 1 + j() * 0.6], [x + rw - 1.5 + j(), y + 1.5 + j()], [x + rw - 1.5 + j(), y + rh - 1.5 + j()], [x + 1.5 + j(), y + rh - 1.5 + j()]], `fill="${tones[Math.floor(r() * tones.length)]}"`);
        x += rw;
      }
      y += rh;
    }
    // sunlight from the left: shade the right half, light the left edge
    s += poly([[cx + 4, yBot], [cx + 3, yTop], [cx + wTop / 2, yTop], [cx + wBot / 2, yBot]], 'fill="rgba(40,30,20,.18)"');
    s += poly([[cx - wBot / 2, yBot], [cx - wTop / 2, yTop], [cx - wTop / 2 + 8, yTop], [cx - wBot / 2 + 9, yBot]], 'fill="rgba(255,240,215,.16)"');
    s += '</g>';
    return s;
  }

  function capital(cx, yBot) {
    // weathering-steel box with an emblem panel, pyramid cap and ball finial
    const top = yBot - 98;
    let s = rect(cx - 42, yBot - 8, 84, 12, `fill="${CORTEN_DK}"`);
    s += rect(cx - 37, top, 74, 92, `fill="${CORTEN}"`);
    s += rect(cx - 37, top, 7, 92, `fill="${CORTEN_HI}"`);
    s += rect(cx + 28, top, 9, 92, 'fill="rgba(0,0,0,.22)"');
    s += rect(cx - 27, top + 11, 54, 68, `fill="${CORTEN_DK}"`);
    s += rect(cx - 23, top + 15, 46, 60, `fill="${RELIEF}"`);
    s += rect(cx - 20, top + 18, 40, 54, 'fill="none" stroke="rgba(80,50,40,.35)" stroke-width="1.5"');
    // emblem: a rose in relief
    const ey = top + 42;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 360;
      s += `<ellipse cx="${cx}" cy="${n(ey - 6)}" rx="5.5" ry="7.5" fill="#bfae94" stroke="#8a6f5c" stroke-width="1" transform="rotate(${a} ${cx} ${n(ey)})"/>`;
    }
    s += circ(cx, ey, 5.5, 'fill="#a88e74"') + `<path d="M${cx - 3},${ey} q3,-4 6,0 q-3,4 -6,0" fill="none" stroke="#6e5544" stroke-width="1.2"/>`;
    s += `<path d="M${cx},${ey + 13} q-2,10 0,20 M${cx},${ey + 22} q-8,-2 -11,-8 M${cx},${ey + 26} q8,-2 11,-8" fill="none" stroke="#8a6f5c" stroke-width="2"/>`;
    s += rect(cx - 44, top - 12, 88, 13, `fill="${CORTEN_DK}"`);
    s += rect(cx - 44, top - 12, 88, 3, `fill="${CORTEN_HI}"`);
    s += poly([[cx - 40, top - 12], [cx + 40, top - 12], [cx, top - 44]], `fill="${CORTEN}"`);
    s += poly([[cx, top - 12], [cx + 40, top - 12], [cx, top - 44]], 'fill="rgba(0,0,0,.2)"');
    s += circ(cx, top - 50, 7, `fill="${CORTEN}"`);
    s += circ(cx - 2, top - 52, 2.5, `fill="${CORTEN_HI}"`);
    return s;
  }

  function halfBarrel(cx, yBot, w, flowers) {
    let s = '';
    for (let i = 0; i < 9; i++) s += ell(cx - w / 2 + 6 + i * (w - 12) / 8, yBot - 34 - (i % 3) * 3, 11, 9, `fill="${['#5f7f46', '#6e8f50', '#557440'][i % 3]}"`);
    for (let i = 0; i < 12; i++) s += circ(cx - w / 2 + 6 + i * (w - 12) / 11, yBot - 38 - (i % 2) * 6, 3.6, `fill="${flowers[i % flowers.length]}"`);
    s += `<path d="M${cx - w / 2},${yBot - 30} L${cx + w / 2},${yBot - 30} L${cx + w / 2 - 4},${yBot} L${cx - w / 2 + 4},${yBot} Z" fill="#7a5638"/>`;
    for (let i = 1; i < 6; i++) s += rect(cx - w / 2 + (w / 6) * i, yBot - 30, 1.3, 30, 'fill="rgba(0,0,0,.2)"');
    s += rect(cx - w / 2 - 1, yBot - 26, w + 2, 4, 'fill="#3a3632"') + rect(cx - w / 2 + 2, yBot - 9, w - 4, 4, 'fill="#3a3632"');
    return s;
  }

  function gatewayArch() {
    let s = '<g class="arch">';
    const L = 250, R = 1250;
    const capBot = 318;
    // the arch rails: shallow quadratic curves between the capitals
    const x1 = L + 37, x2 = R - 37, span = x2 - x1;
    const lowEnd = 270, lowMid = 152; // lower rail
    const gap = 50; // distance between rails
    const lowC = 2 * lowMid - lowEnd;
    const ly = (t) => (1 - t) * (1 - t) * lowEnd + 2 * t * (1 - t) * lowC + t * t * lowEnd;
    const lx = (t) => x1 + span * t;
    const lang = (t) => (Math.atan2(2 * (lowC - lowEnd) * (1 - 2 * t), span) * 180) / Math.PI;

    // pillars
    [L, R].forEach((cx, i) => {
      s += rect(cx - 52, 690, 104, 16, 'fill="#8d8577"');
      s += fieldstonePillar(cx, capBot, 692, 70, 94, 60 + i);
      s += rect(cx - 48, 488, 96, 11, 'fill="#bdb29c"');
      s += rect(cx - 48, 499, 96, 4, 'fill="rgba(0,0,0,.25)"');
      s += rect(cx - 41, capBot - 2, 82, 12, 'fill="#a9a08f"') + rect(cx - 41, capBot + 10, 82, 3, 'fill="rgba(0,0,0,.25)"');
      s += capital(cx, capBot - 2);
    });

    // curved braces under the rails at each end
    [[x1, 1], [x2, -1]].forEach(([bx, d]) => {
      const t = d > 0 ? 0.07 : 0.93;
      s += `<path d="M${bx},${capBot - 6} Q${bx + d * 8},${n(ly(t) + 10)} ${n(lx(t))},${n(ly(t) + 4)}" fill="none" stroke="${CORTEN}" stroke-width="6"/>`;
      s += `<path d="M${bx + d * 4},${capBot - 26} C${bx + d * 26},${capBot - 26} ${bx + d * 30},${capBot - 46} ${bx + d * 18},${capBot - 50} C${bx + d * 10},${capBot - 52} ${bx + d * 8},${capBot - 40} ${bx + d * 16},${capBot - 40}" fill="none" stroke="${CORTEN}" stroke-width="3.5" stroke-linecap="round"/>`;
    });

    // Western frieze standing on the lower rail
    const figures = [
      [0.065, 'rider', false], [0.13, 'steer', false], [0.185, 'steer', false], [0.24, 'steer', false],
      [0.295, 'horse', false], [0.355, 'roper', false],
      [0.645, 'rider', true], [0.70, 'steer', true], [0.755, 'steer', true], [0.81, 'steer', true],
      [0.868, 'horse', true], [0.93, 'wagon', true]
    ];
    const scaleOf = { rider: 0.43, roper: 0.43, horse: 0.5, steer: 0.58, wagon: 0.56 };
    figures.forEach(([t, kind, flip]) => {
      s += silhouette(kind, lx(t), ly(t) - 5, lang(t), scaleOf[kind], flip);
    });

    // rails (drawn after figures so the feet sit on them)
    const lower = `M${x1},${lowEnd} Q750,${lowC} ${x2},${lowEnd}`;
    const upper = `M${x1},${lowEnd - gap} Q750,${lowC - gap} ${x2},${lowEnd - gap}`;
    [lower, upper].forEach((d) => {
      s += `<path d="${d}" fill="none" stroke="${CORTEN}" stroke-width="11"/>`;
      s += `<path d="${d}" fill="none" stroke="${CORTEN_HI}" stroke-width="2" transform="translate(0,-4)"/>`;
    });
    // end posts and rivets
    s += rect(x1 - 2, lowEnd - gap - 4, 8, gap + 8, `fill="${CORTEN}"`) + rect(x2 - 6, lowEnd - gap - 4, 8, gap + 8, `fill="${CORTEN}"`);
    for (let t = 0.04; t < 0.98; t += 0.045) {
      if (t > 0.39 && t < 0.61) continue;
      s += circ(lx(t), ly(t), 1.8, `fill="${CORTEN_DK}"`) + circ(lx(t), ly(t) - gap, 1.8, `fill="${CORTEN_DK}"`);
    }

    // central medallion: TEMECULA / EST. 1859
    const my = lowMid - gap / 2 - 2;
    s += ell(750, my + 3, 104, 70, 'fill="rgba(0,0,0,.18)"');
    s += ell(750, my, 102, 68, `fill="${CORTEN_DK}"`);
    s += ell(750, my, 97, 63, 'fill="#efe6d3"');
    s += ell(750, my, 90, 56, `fill="${CORTEN}"`);
    s += ell(750, my, 84, 50, 'fill="none" stroke="#efe6d3" stroke-width="1.6"');
    s += `<path id="medTop" d="M${750 - 70},${my + 10} A70,46 0 0 1 ${750 + 70},${my + 10}" fill="none"/>`;
    s += `<text class="medal-letters" font-size="24" letter-spacing="1.2"><textPath href="#medTop" startOffset="50%" text-anchor="middle">TEMECULA</textPath></text>`;
    s += `<text x="750" y="${my + 38}" text-anchor="middle" class="medal-letters" font-size="17" letter-spacing="2.2">EST. 1859</text>`;
    // small tree emblem between the words
    s += rect(748.6, my + 8, 2.8, 12, 'class="medal-fill"');
    s += ell(750, my + 6, 10, 6.5, 'class="medal-fill"') + ell(744, my + 9, 5, 3.5, 'class="medal-fill"') + ell(756, my + 9, 5, 3.5, 'class="medal-fill"');
    s += ell(750 - 99, my, 5, 9, `fill="${CORTEN}"`) + ell(750 + 99, my, 5, 9, `fill="${CORTEN}"`);

    // half-barrel planters at the pillar bases (as in the photo)
    s += halfBarrel(L + 70, 706, 64, ['#d9415a', '#f2c14e', '#f4efe4']);
    s += halfBarrel(R - 70, 706, 64, ['#8f5bd1', '#f4efe4', '#e86f8a']);
    return s + '</g>';
  }

  /* Twin-globe lamp on a timber post, like the street lamps along Old Town
     Front Street and Main Street. */
  function twinLamp(x, y, headY, scale = 1) {
    let s = `<g transform="translate(${n(x)},${n(y)}) scale(${scale}) translate(${-x},${-y})">`;
    s += rect(x - 10, y - 26, 20, 26, `fill="${IRON}"`);
    s += rect(x - 6, headY + 18, 12, y - 26 - headY - 18, 'fill="#5d4433"');
    s += rect(x - 6, headY + 18, 3, y - 26 - headY - 18, 'fill="rgba(255,255,255,.14)"');
    s += rect(x - 8, headY + 14, 16, 8, `fill="${IRON}"`);
    // Old Town banner
    s += rect(x + 6, headY + 64, 26, 3, `fill="${IRON}"`);
    s += `<path d="M${x + 9},${headY + 67} h21 v54 l-10.5,-8 l-10.5,8 Z" class="banner"/>`;
    s += `<path d="M${x + 13},${headY + 84} q7,-8 14,0" class="banner-mark" fill="none" stroke-width="2"/>`;
    // cross-arm with scrolls
    s += `<path d="M${x - 26},${headY + 4} Q${x},${headY + 24} ${x + 26},${headY + 4}" stroke="${IRON}" stroke-width="4" fill="none"/>`;
    s += `<path d="M${x},${headY + 18} q-12,-1 -14,-11 q4,-2 6,2 M${x},${headY + 18} q12,-1 14,-11 q-4,-2 -6,2" stroke="${IRON}" stroke-width="2.4" fill="none"/>`;
    s += rect(x - 2.5, headY - 8, 5, 26, `fill="${IRON}"`);
    s += circ(x, headY - 11, 4, `fill="${IRON}"`);
    [x - 26, x + 26].forEach((gx) => {
      s += rect(gx - 6, headY - 2, 12, 8, `fill="${IRON}"`);
      s += circ(gx, headY - 14, 12, 'class="globe"');
      s += ell(gx - 4, headY - 18, 3.5, 5, 'fill="#fff" opacity=".6"');
      s += `<path d="M${gx - 6},${headY - 25} h12 l-2,-4 h-8 Z" fill="${IRON}"/>`;
      if (scale === 1) {
        LIGHTS.push(circ(gx, headY - 14, 46, 'fill="url(#halo)"'));
        LIGHTS.push(circ(gx, headY - 14, 11, 'fill="#fff4d6"'));
      }
    });
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
    s += rect(x0, BASE + WALK_H, W - x0, H - BASE - WALK_H, 'class="road"');
    s += rect(x0, BASE + WALK_H, W - x0, H - BASE - WALK_H, 'fill="url(#streetFade)"');
    // blend the seam between the perspective road and the elevation street
    s += rect(GATE_W - 150, 620, 300, H - 620, 'class="road"');
    // the promenade: a wider, paved band between the visitor and the stalls
    s += rect(x0, STALL_BOTTOM + 6, W - x0, H - STALL_BOTTOM - 6, 'class="promenade"');
    s += rect(x0, STALL_BOTTOM + 6, W - x0, H - STALL_BOTTOM - 6, 'fill="url(#pavers)"');
    s += rect(x0, STALL_BOTTOM + 4, W - x0, 3, 'fill="rgba(60,45,30,.12)"');

    const seq = [
      ['western', 340],
      ['hotelTemecula', 520],
      ['tree', 140],
      ['victorian', 360],
      ['mercantile', 380],
      ['barn', 200],
      ['cross', 220, 'MAIN ST'],
      ['bank1914', 400],
      ['welty', 360],
      ['tree', 150],
      ['machado', 420],
      ['theater', 440],
      ['woodClock', 400],
      ['tree', 180],
      ['ff', 240, { color: '#d8cdb6', parapet: 'peak' }]
    ];
    let x = GATE_W;
    let seed = 3;
    seq.forEach(([type, w, o]) => {
      if (type === 'ff') s += falseFront(x, w, o);
      else if (type === 'hotelTemecula') s += hotelTemecula(x, w);
      else if (type === 'mercantile') s += mercantile(x, w);
      else if (type === 'barn') s += barnBoard(x, w);
      else if (type === 'cross') s += crossStreet(x, w, o);
      else if (type === 'bank1914') s += bank1914(x, w);
      else if (type === 'welty') s += weltyStore(x, w);
      else if (type === 'machado') s += machadoStore(x, w);
      else if (type === 'clock') s += clockTower(x, w);
      else if (type === 'western') s += westernBalcony(x, w);
      else if (type === 'victorian') s += victorianGrey(x, w);
      else if (type === 'theater') s += theaterRow(x, w);
      else if (type === 'woodClock') s += woodClock(x, w);
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
      s += twinLamp(lx, STALL_BOTTOM, 334);
      if (i < lamps.length - 1) s += stringLights(lx, 318, lamps[i + 1], 318, 34, 14);
    });

    // end-of-market signpost
    const ex = W - 330;
    s += rect(ex, 440, 8, 266, `fill="${WOOD_DK}"`);
    s += rect(ex - 140, 460, 290, 76, `rx="4" fill="${WOOD_LT}"`);
    s += rect(ex - 134, 466, 278, 64, `rx="3" fill="#efe3c8"`);
    s += `<text x="${ex + 5}" y="493" text-anchor="middle" class="sign-paint" font-size="17" fill="#3b2f25">End of today's market</text>`;
    s += `<text x="${ex + 5}" y="516" text-anchor="middle" class="sign-small" font-size="10" fill="#6b4a32" letter-spacing="1.6">EVERY BUSINESS IS IN THE DIRECTORY</text>`;

    s += '</svg>';
    archSvg.innerHTML = s;

    /* --- foreground: the arch and the seam tree sit above the evening lights --- */
    let fg = `<svg viewBox="0 0 ${FG_W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`;
    // seam: large pepper tree + wooden way-sign
    fg += tree(GATE_W - 150, 280, 55, { top: 120 });
    fg += rect(GATE_W + 58, 470, 8, 236, `fill="${WOOD_DK}"`);
    fg += rect(GATE_W - 22, 470, 168, 44, `rx="4" fill="${WOOD_DK}"`) + rect(GATE_W - 17, 475, 158, 34, `rx="3" fill="#efe3c8"`);
    fg += `<text x="${GATE_W + 62}" y="499" text-anchor="middle" class="sign-paint" font-size="16" fill="#3b2f25">Homegrown Market</text>`;
    fg += poly([[GATE_W - 2, 524], [GATE_W + 128, 524], [GATE_W + 148, 542], [GATE_W + 128, 560], [GATE_W - 2, 560]], `fill="${WOOD_LT}"`);
    fg += `<text x="${GATE_W + 66}" y="548" text-anchor="middle" class="sign-small" font-size="13" fill="#3b2f25" letter-spacing="1">STALLS THIS WAY →</text>`;

    fg += twinLamp(120, 706, 360) + twinLamp(1380, 706, 360);
    fg += gatewayArch();
    fgSvg.innerHTML = fg + '</svg>';
    fgSvg.style.width = (FG_W / W) * 100 + '%';
    fgSvg.style.right = 'auto';

    lightsSvg.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs><radialGradient id="halo"><stop offset="0" stop-color="#ffd27a" stop-opacity=".75"/><stop offset=".35" stop-color="#ffb24a" stop-opacity=".25"/><stop offset="1" stop-color="#ff9a3a" stop-opacity="0"/></radialGradient></defs>
      ${LIGHTS.join('')}</svg>`;
  };
})();
