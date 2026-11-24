/*
 * STALL COMPONENT — one market stall, drawn from one business record.
 *
 * TH.renderStall(business) returns a self-contained SVG (viewBox 240 x 320).
 * It has no knowledge of the street: the marketplace decides where it stands.
 * Changing a business record changes only its stall.
 *
 * The goods on the counter are illustrated, never photographs. Real photos
 * supplied by each business appear in its profile (Phase 2).
 */
(function () {
  'use strict';
  const TH = (window.TH = window.TH || {});
  const n = (v) => Math.round(v * 10) / 10;
  const rect = (x, y, w, h, a = '') => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" ${a}/>`;
  const circ = (cx, cy, r, a = '') => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" ${a}/>`;
  const ell = (cx, cy, rx, ry, a = '') => `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" ${a}/>`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const WOOD = '#8a6644', WOOD_DK = '#5e4430', WOOD_LT = '#b38a60';
  const COUNTER_Y = 226; // top of the counter: goods stand on this line
  const SHELF_Y = 166;

  /* ---------------- goods ---------------- */
  const goods = {
    bakery() {
      let s = '';
      // basket of baguettes
      s += `<path d="M34,${COUNTER_Y} L40,${COUNTER_Y - 26} L92,${COUNTER_Y - 26} L98,${COUNTER_Y} Z" fill="#b08a52"/>`;
      for (let i = 0; i < 4; i++) s += rect(36, COUNTER_Y - 24 + i * 6, 60, 1.4, 'fill="rgba(60,40,20,.3)"');
      [[46, -60, -8], [58, -66, 4], [70, -58, 12], [82, -54, 20]].forEach(([x, y, r]) => {
        s += `<rect x="${x - 6}" y="${COUNTER_Y + y}" width="12" height="44" rx="6" fill="#d49a52" transform="rotate(${r} ${x} ${COUNTER_Y - 26})"/>`;
        s += `<path d="M${x - 2},${COUNTER_Y + y + 10} l4,-3 M${x - 2},${COUNTER_Y + y + 20} l4,-3 M${x - 2},${COUNTER_Y + y + 30} l4,-3" stroke="#a66a2e" stroke-width="1.6" transform="rotate(${r} ${x} ${COUNTER_Y - 26})"/>`;
      });
      // round loaves on a board
      s += rect(104, COUNTER_Y - 5, 74, 5, `fill="${WOOD_LT}"`);
      [[118, 16], [141, 18], [164, 15]].forEach(([x, r]) => {
        s += ell(x, COUNTER_Y - 5 - r * 0.62, r, r * 0.72, 'fill="#c98943"');
        s += ell(x - r * 0.25, COUNTER_Y - 5 - r * 0.85, r * 0.5, r * 0.25, 'fill="#e0ad6c" opacity=".7"');
        s += `<path d="M${x - r * 0.5},${COUNTER_Y - 5 - r * 0.8} q${r * 0.5},-6 ${r},0" stroke="#f1d4a3" stroke-width="2" fill="none"/>`;
      });
      // cake stand
      s += rect(194, COUNTER_Y - 30, 4, 30, 'fill="#e9e2d6"') + ell(196, COUNTER_Y - 30, 18, 3, 'fill="#e9e2d6"') + ell(196, COUNTER_Y - 1, 10, 2.5, 'fill="#e9e2d6"');
      s += `<path d="M181,${COUNTER_Y - 32} L181,${COUNTER_Y - 52} Q196,${COUNTER_Y - 60} 211,${COUNTER_Y - 52} L211,${COUNTER_Y - 32} Z" fill="#f1ddb7"/>`;
      s += `<path d="M181,${COUNTER_Y - 52} Q196,${COUNTER_Y - 60} 211,${COUNTER_Y - 52} q-4,6 -8,0 q-4,6 -7,0 q-4,6 -8,0 q-4,6 -8,0 Z" fill="#fbf4e6"/>`;
      s += circ(196, COUNTER_Y - 60, 3, 'fill="#b5302a"');
      return s;
    },
    bakeryShelf() {
      let s = '';
      [44, 74, 104, 134, 164, 194].forEach((x, i) => {
        s += rect(x - 10, SHELF_Y - 22, 20, 22, 'rx="3" fill="rgba(255,255,255,.55)" stroke="rgba(90,60,40,.35)"');
        s += ell(x, SHELF_Y - 8, 7, 5, `fill="${i % 2 ? '#c98943' : '#e0b06a'}"`);
      });
      return s;
    },
    candles(c) {
      let s = '';
      const cols = ['#f1e8d4', '#d9c7a6', '#b9c9b2', '#e7c9c2', '#f1e8d4', '#c8b9a0'];
      const hs = [46, 62, 38, 54, 30, 44];
      hs.forEach((h, i) => {
        const x = 34 + i * 18 + (i > 2 ? 4 : 0);
        s += rect(x, COUNTER_Y - h, 14, h, `rx="2" fill="${cols[i]}"`);
        s += rect(x + 2, COUNTER_Y - h, 3, h, 'fill="rgba(255,255,255,.35)"');
        s += line2(x + 7, COUNTER_Y - h, x + 7, COUNTER_Y - h - 4);
        s += `<path d="M${x + 7},${COUNTER_Y - h - 16} q5,8 0,11 q-5,-3 0,-11 Z" class="flame"/>`;
      });
      // jar candles with labels
      [[160, '#e8dcc6'], [182, '#d1dcc9'], [204, '#ead2cb']].forEach(([x, col]) => {
        s += rect(x - 10, COUNTER_Y - 30, 20, 30, 'rx="3" fill="rgba(220,230,232,.75)" stroke="rgba(80,90,90,.35)"');
        s += rect(x - 9, COUNTER_Y - 20, 18, 19, `fill="${col}"`);
        s += rect(x - 8, COUNTER_Y - 16, 16, 9, `fill="${c[2]}"`);
        s += rect(x - 11, COUNTER_Y - 34, 22, 5, 'rx="1.5" fill="#b08a52"');
      });
      return s;
    },
    candlesShelf(c) {
      let s = '';
      for (let i = 0; i < 7; i++) {
        const x = 40 + i * 26;
        s += rect(x - 8, SHELF_Y - 22, 16, 22, 'rx="2" fill="rgba(220,230,232,.7)" stroke="rgba(80,90,90,.3)"');
        s += rect(x - 7, SHELF_Y - 12, 14, 8, `fill="${i % 2 ? c[0] : '#e9dcc4'}"`);
      }
      return s;
    },
    jewelry(c) {
      let s = '';
      // velvet trays
      [[30, 70], [106, 64]].forEach(([x, w]) => {
        s += rect(x, COUNTER_Y - 10, w, 10, `fill="${c[2]}"`);
        s += rect(x + 3, COUNTER_Y - 9, w - 6, 6, 'fill="rgba(0,0,0,.25)"');
        for (let i = 0; i < w / 10 - 1; i++) {
          s += circ(x + 9 + i * 10, COUNTER_Y - 9, 3.2, `fill="none" stroke="${i % 3 ? '#d8d8d4' : '#d9b36a'}" stroke-width="1.8"`);
        }
      });
      // display bust with necklace
      s += `<path d="M184,${COUNTER_Y} L180,${COUNTER_Y - 18} C170,${COUNTER_Y - 30} 172,${COUNTER_Y - 52} 186,${COUNTER_Y - 58} L188,${COUNTER_Y - 76} L204,${COUNTER_Y - 76} L206,${COUNTER_Y - 58} C220,${COUNTER_Y - 52} 222,${COUNTER_Y - 30} 212,${COUNTER_Y - 18} L208,${COUNTER_Y} Z" fill="${c[2]}"/>`;
      s += `<path d="M186,${COUNTER_Y - 58} Q196,${COUNTER_Y - 34} 206,${COUNTER_Y - 58}" stroke="#e1e1dc" stroke-width="1.6" fill="none"/>`;
      s += `<path d="M196,${COUNTER_Y - 44} l-4,7 l4,6 l4,-6 Z" fill="#9fc3d1" stroke="#e1e1dc" stroke-width="1"/>`;
      // small mirror
      s += ell(184 - 26, COUNTER_Y - 30, 10, 14, `fill="#c6d3d6" stroke="${WOOD_LT}" stroke-width="3"`) + rect(156, COUNTER_Y - 16, 4, 16, `fill="${WOOD_LT}"`);
      return s;
    },
    jewelryShelf(c) {
      let s = '';
      [50, 90, 130, 170].forEach((x) => {
        s += rect(x - 12, SHELF_Y - 14, 24, 14, `fill="${c[2]}"`);
        s += `<path d="M${x - 12},${SHELF_Y - 14} l3,-10 h18 l3,10" fill="${c[0]}"/>`;
        s += circ(x, SHELF_Y - 8, 3, 'fill="none" stroke="#d9b36a" stroke-width="1.8"');
      });
      // hanging earrings on a card
      s += rect(190, SHELF_Y - 30, 20, 30, 'fill="#f4efe6"');
      [196, 204].forEach((x) => (s += circ(x, SHELF_Y - 14, 3, 'fill="none" stroke="#d9b36a" stroke-width="1.6"') + rect(x - 0.5, SHELF_Y - 24, 1, 8, 'fill="#d9b36a"')));
      return s;
    },
    ceramics(c) {
      let s = '';
      const pots = [
        [52, 50, 18, '#c9d1cf'], [90, 38, 22, c[0]], [130, 56, 15, '#d9cbb5'], [166, 34, 20, '#8fa7a8']
      ];
      pots.forEach(([x, h, r, col]) => {
        s += `<path d="M${x - r * 0.45},${COUNTER_Y - h} C${x - r * 0.45},${COUNTER_Y - h * 0.8} ${x - r * 1.2},${COUNTER_Y - h * 0.55} ${x - r},${COUNTER_Y - h * 0.15} Q${x - r * 0.8},${COUNTER_Y} ${x},${COUNTER_Y} Q${x + r * 0.8},${COUNTER_Y} ${x + r},${COUNTER_Y - h * 0.15} C${x + r * 1.2},${COUNTER_Y - h * 0.55} ${x + r * 0.45},${COUNTER_Y - h * 0.8} ${x + r * 0.45},${COUNTER_Y - h} Z" fill="${col}"/>`;
        s += ell(x, COUNTER_Y - h, r * 0.48, 2.5, 'fill="rgba(0,0,0,.25)"');
        s += `<path d="M${x - r * 0.8},${COUNTER_Y - h * 0.45} Q${x},${COUNTER_Y - h * 0.35} ${x + r * 0.8},${COUNTER_Y - h * 0.45}" stroke="rgba(255,255,255,.4)" stroke-width="2" fill="none"/>`;
      });
      // stacked bowls
      [0, 1, 2].forEach((i) => (s += `<path d="M${188 - i},${COUNTER_Y - 6 - i * 7} q14,${10} 28,0 Z" fill="${i % 2 ? '#d9cbb5' : c[0]}"/>`));
      return s;
    },
    ceramicsShelf(c) {
      let s = '';
      [44, 72, 100, 128, 156, 184].forEach((x, i) => {
        s += rect(x - 9, SHELF_Y - 18, 18, 18, `rx="3" fill="${i % 2 ? '#d9cbb5' : c[0]}"`);
        s += `<path d="M${x + 9},${SHELF_Y - 14} q8,4 0,10" stroke="${i % 2 ? '#d9cbb5' : c[0]}" stroke-width="3" fill="none"/>`;
      });
      return s;
    },
    soap(c) {
      let s = rect(30, COUNTER_Y - 24, 76, 24, `fill="${WOOD_LT}"`) + rect(30, COUNTER_Y - 24, 76, 4, `fill="${WOOD}"`);
      s += `<text x="68" y="${COUNTER_Y - 7}" text-anchor="middle" font-size="8" class="stall-small" fill="${WOOD_DK}" letter-spacing="1.5">HANDMADE</text>`;
      const cols = ['#e9dcc8', '#c9b3c4', '#b9c9b2', '#f0d9b6', '#d9c1b9'];
      let k = 0;
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < 4 - row; i++) {
          const x = 116 + i * 24 + row * 12, y = COUNTER_Y - 14 - row * 14;
          s += rect(x, y, 22, 13, `rx="2" fill="${cols[k++ % cols.length]}"`);
          s += rect(x + 7, y, 8, 13, 'fill="#c4a57a"');
        }
      }
      // pump bottles
      [[44, 20], [60, 20], [76, 20], [92, 20]].forEach(([x], i) => {
        s += rect(x - 6, COUNTER_Y - 46, 12, 22, `rx="3" fill="${i % 2 ? '#d8e3df' : '#efe6d8'}"`);
        s += rect(x - 2, COUNTER_Y - 52, 4, 6, 'fill="#3a3632"') + rect(x - 2, COUNTER_Y - 53, 7, 2, 'fill="#3a3632"');
        s += rect(x - 5, COUNTER_Y - 40, 10, 8, `fill="${c[0]}"`);
      });
      return s;
    },
    soapShelf(c) {
      let s = '';
      for (let i = 0; i < 6; i++) {
        const x = 34 + i * 30;
        s += rect(x, SHELF_Y - 12, 24, 12, `rx="2" fill="${i % 2 ? c[1] : '#e1cdb6'}"`);
        s += rect(x + 8, SHELF_Y - 12, 8, 12, `fill="${c[0]}" opacity=".7"`);
      }
      return s;
    },
    plants() {
      let s = '';
      [[46, 1.1], [82, 0.9], [118, 1.2], [156, 0.85], [192, 1.05]].forEach(([x, k], i) => {
        const pw = 26 * k, ph = 22 * k;
        s += `<path d="M${x - pw / 2},${COUNTER_Y - ph} L${x + pw / 2},${COUNTER_Y - ph} L${x + pw * 0.38},${COUNTER_Y} L${x - pw * 0.38},${COUNTER_Y} Z" fill="#b8643f"/>`;
        s += rect(x - pw / 2 - 2, COUNTER_Y - ph - 4, pw + 4, 6, 'fill="#a5583a"');
        // rosette
        const greens = ['#7f9c6a', '#9db487', '#6b8a5a'];
        for (let j = 0; j < 9; j++) {
          const a = Math.PI + (j / 8) * Math.PI;
          const lx = x + Math.cos(a) * 11 * k, ly = COUNTER_Y - ph - 4 + Math.sin(a) * 11 * k;
          s += `<ellipse cx="${n(lx)}" cy="${n(ly)}" rx="${n(8 * k)}" ry="${n(3.6 * k)}" fill="${greens[(j + i) % 3]}" transform="rotate(${n((a * 180) / Math.PI)} ${n(lx)} ${n(ly)})"/>`;
        }
        s += ell(x, COUNTER_Y - ph - 8 * k, 6 * k, 5 * k, 'fill="#a9c193"');
        if (i % 2 === 0) s += circ(x + 4, COUNTER_Y - ph - 18 * k, 2.6, 'fill="#e98a6a"');
      });
      return s;
    },
    plantsShelf() {
      let s = '';
      for (let i = 0; i < 7; i++) {
        const x = 40 + i * 26;
        s += `<path d="M${x - 8},${SHELF_Y - 12} h16 l-3,12 h-10 Z" fill="#c07650"/>`;
        s += ell(x, SHELF_Y - 15, 8, 5, `fill="${i % 2 ? '#7f9c6a' : '#9db487'}"`);
      }
      // trailing plant
      s += `<path d="M206,${SHELF_Y - 6} q6,20 -2,40 M200,${SHELF_Y - 6} q-4,18 2,34" stroke="#6b8a5a" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="5 2"/>`;
      return s;
    },
    textiles(c) {
      let s = '';
      // folded stack
      const cols = [c[0], '#e9dcc4', '#7c8f9c', '#d6a04a', c[2], '#efe6d8'];
      cols.forEach((col, i) => {
        const y = COUNTER_Y - 9 - i * 9;
        s += rect(34, y, 74, 9, `rx="3" fill="${col}"`);
        s += rect(34, y + 3, 74, 1, 'fill="rgba(255,255,255,.4)" stroke-dasharray="3 2"');
      });
      // rolled runners
      [[132, '#e9dcc4'], [154, c[0]], [176, '#7c8f9c'], [198, '#d6a04a']].forEach(([x, col]) => {
        s += rect(x - 9, COUNTER_Y - 18, 18, 18, `rx="9" fill="${col}"`);
        s += circ(x, COUNTER_Y - 9, 5, 'fill="rgba(0,0,0,.15)"');
      });
      return s;
    },
    textilesShelf(c) {
      // patchwork quilt hung on the backdrop instead of a shelf
      let s = '';
      const cols = [c[0], '#efe6d8', '#7c8f9c', '#d6a04a', '#e9dcc4', c[2]];
      for (let r = 0; r < 4; r++) for (let q = 0; q < 6; q++) s += rect(54 + q * 22, 112 + r * 22, 22, 22, `fill="${cols[(r * 2 + q) % cols.length]}" stroke="rgba(255,255,255,.35)" stroke-width="1"`);
      s += rect(50, 108, 140, 4, `fill="${WOOD_DK}"`);
      return { back: true, svg: s };
    },
    art() {
      let s = '';
      // easel with a landscape painting
      s += `<path d="M58,${COUNTER_Y} L76,${COUNTER_Y - 92} L94,${COUNTER_Y}" stroke="${WOOD_DK}" stroke-width="4" fill="none"/>`;
      s += rect(46, COUNTER_Y - 88, 60, 46, `fill="${WOOD_LT}"`);
      s += rect(50, COUNTER_Y - 84, 52, 38, 'fill="#e9edf0"');
      s += `<path d="M50,${COUNTER_Y - 58} q12,-10 26,-4 q14,-10 26,0 V${COUNTER_Y - 46} H50 Z" fill="#9db487"/>`;
      s += `<path d="M50,${COUNTER_Y - 52} q16,-8 30,0 q12,-6 22,-2 V${COUNTER_Y - 46} H50 Z" fill="#c9a86a"/>`;
      s += circ(90, COUNTER_Y - 74, 5, 'fill="#e9b36a"');
      s += rect(46, COUNTER_Y - 42, 60, 4, `fill="${WOOD_DK}"`);
      // print crate
      s += rect(126, COUNTER_Y - 30, 84, 30, `fill="${WOOD}"`);
      ['#c8d6e0', '#e8d9c0', '#b9c9b2', '#e7c9c2'].forEach((col, i) => (s += rect(132 + i * 19, COUNTER_Y - 46 + i * 2, 17, 22, `fill="${col}" stroke="#fff" stroke-width="1.5"`)));
      s += rect(126, COUNTER_Y - 18, 84, 3, `fill="${WOOD_DK}"`);
      return s;
    },
    artShelf() {
      let s = '';
      [[48, 30, 36, '#c8d6e0'], [92, 40, 30, '#e8d9c0'], [146, 30, 40, '#b9c9b2'], [188, 26, 26, '#e7c9c2']].forEach(([x, w, h, col]) => {
        s += rect(x - w / 2 - 3, 112, w + 6, h + 6, `fill="${WOOD_DK}"`);
        s += rect(x - w / 2, 115, w, h, `fill="${col}"`);
        s += `<path d="M${x - w / 2},${115 + h * 0.7} q${w / 3},-8 ${w / 2},-2 q${w / 4},-6 ${w / 2},0 V${115 + h} H${x - w / 2} Z" fill="rgba(80,110,70,.45)"/>`;
      });
      return { back: true, svg: s };
    },
    honey(c) {
      let s = '';
      for (let i = 0; i < 5; i++) {
        const x = 40 + i * 22, h = i % 2 ? 30 : 36;
        s += rect(x - 9, COUNTER_Y - h, 18, h, `rx="4" fill="${i % 2 ? '#d9922e' : '#e6a93a'}" opacity=".92"`);
        s += rect(x - 6, COUNTER_Y - h + 4, 3, h - 8, 'fill="rgba(255,255,255,.35)"');
        s += rect(x - 7, COUNTER_Y - h * 0.62, 14, 10, 'fill="#f4ead0"');
        // gingham lid cover
        s += `<path d="M${x - 12},${COUNTER_Y - h + 1} q12,-12 24,0 l-2,3 h-20 Z" fill="#c34b3c"/>`;
        s += rect(x - 10, COUNTER_Y - h + 1, 20, 2, 'fill="#f4ead0"');
      }
      // honeycomb frame + dipper
      s += rect(154, COUNTER_Y - 44, 56, 44, `fill="${WOOD_LT}"`);
      s += rect(158, COUNTER_Y - 40, 48, 36, 'fill="#e1a83c"');
      for (let r = 0; r < 4; r++) for (let q = 0; q < 6; q++) s += circ(162 + q * 8 + (r % 2) * 4, COUNTER_Y - 36 + r * 9, 3.4, 'fill="none" stroke="#b67a1f" stroke-width="1.2"');
      return s;
    },
    honeyShelf() {
      let s = '';
      ['#7b2a3a', '#c34b3c', '#5a2c4a', '#d77a2f', '#7b2a3a', '#c34b3c'].forEach((col, i) => {
        const x = 42 + i * 30;
        s += rect(x - 9, SHELF_Y - 20, 18, 20, `rx="3" fill="${col}"`);
        s += rect(x - 10, SHELF_Y - 23, 20, 4, 'fill="#d9b36a"');
        s += rect(x - 6, SHELF_Y - 14, 12, 7, 'fill="#f4ead0"');
      });
      return s;
    },
    leather(c) {
      let s = '';
      // wallets & belt coils
      [[44, '#8a5a3b'], [70, '#5e3b26'], [96, '#a8744c']].forEach(([x, col]) => {
        s += rect(x - 11, COUNTER_Y - 16, 22, 16, `rx="2" fill="${col}"`);
        s += rect(x - 9, COUNTER_Y - 14, 18, 12, 'rx="1.5" fill="none" stroke="rgba(255,235,200,.5)" stroke-dasharray="2 1.5"');
      });
      [[136, '#5e3b26'], [168, '#8a5a3b']].forEach(([x, col]) => {
        s += circ(x, COUNTER_Y - 14, 14, `fill="none" stroke="${col}" stroke-width="7"`);
        s += circ(x, COUNTER_Y - 14, 6, `fill="none" stroke="${col}" stroke-width="6"`);
      });
      s += rect(190, COUNTER_Y - 22, 20, 14, 'fill="none" stroke="#c9a86a" stroke-width="3"');
      return s;
    },
    leatherShelf(c) {
      // bags hung from a rail on the backdrop
      let s = rect(40, 114, 160, 4, `fill="${WOOD_DK}"`);
      [[64, 36, 34, '#8a5a3b'], [112, 42, 40, '#5e3b26'], [162, 34, 30, '#a8744c']].forEach(([x, w, h, col]) => {
        s += `<path d="M${x - w * 0.3},${132} Q${x},${104} ${x + w * 0.3},${132}" stroke="${col}" stroke-width="3.5" fill="none"/>`;
        s += rect(x - w / 2, 130, w, h, `rx="5" fill="${col}"`);
        s += rect(x - w / 2, 130, w, h * 0.36, `rx="5" fill="rgba(0,0,0,.18)"`);
        s += rect(x - 3, 130 + h * 0.3, 6, 6, 'fill="#c9a86a"');
      });
      return { back: true, svg: s };
    }
  };
  function line2(x1, y1, x2, y2) { return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#3a3632" stroke-width="1.2"/>`; }

  /* ---------------- roofs ---------------- */
  function awningRoof(c) {
    let s = '';
    const stripes = 10;
    const top = [22, 228], bot = [0, 240], yT = 70, yB = 104;
    for (let i = 0; i < stripes; i++) {
      const a = i / stripes, b = (i + 1) / stripes;
      const tx1 = top[0] + (top[1] - top[0]) * a, tx2 = top[0] + (top[1] - top[0]) * b;
      const bx1 = bot[0] + (bot[1] - bot[0]) * a, bx2 = bot[0] + (bot[1] - bot[0]) * b;
      s += `<polygon points="${n(tx1)},${yT} ${n(tx2)},${yT} ${n(bx2)},${yB} ${n(bx1)},${yB}" fill="${i % 2 ? c[1] : c[0]}"/>`;
      s += `<path d="M${n(bx1)},${yB} H${n(bx2)} v4 q${n(-(bx2 - bx1) / 2)},13 ${n(-(bx2 - bx1))},0 Z" fill="${i % 2 ? c[1] : c[0]}"/>`;
    }
    s += rect(20, yT - 4, 210, 5, `fill="${WOOD_DK}"`);
    s += `<polygon points="22,${yT} 228,${yT} 240,${yB} 0,${yB}" fill="url(#awnShade)"/>`;
    return s;
  }
  function gableRoof() {
    let s = '';
    s += '<polygon points="-4,110 120,46 244,110 232,116 120,58 8,116" fill="#6d5d52"/>';
    s += '<polygon points="8,116 120,58 232,116" fill="#8a7867"/>';
    s += '<polygon points="8,116 120,58 232,116" fill="url(#stallShingle)"/>';
    s += '<polygon points="-4,110 120,46 244,110 238,114 120,54 2,114" fill="#4f433b"/>';
    s += rect(116, 40, 8, 12, `fill="${WOOD_DK}"`);
    return s;
  }

  function categoryTag(cat) {
    const home = cat === 'home';
    const col = home ? 'var(--cat-home)' : 'var(--cat-micro)';
    let s = `<g transform="translate(6,182)">`;
    s += `<line x1="8" y1="-10" x2="11" y2="2" stroke="#3a3632" stroke-width="1"/>`;
    s += `<rect x="0" y="0" width="22" height="26" rx="3" style="fill:${col}"/>`;
    s += circ(11, 5, 1.8, 'fill="#f4efe6"');
    if (home) s += '<path d="M5,20 V14 L11,9 L17,14 V20 Z" fill="none" stroke="#f4efe6" stroke-width="1.8" stroke-linejoin="round"/>';
    else s += '<path d="M5,20 L14,11 M12,9 l4,4 l3,-3 l-4,-4 Z M6,11 l8,9" fill="none" stroke="#f4efe6" stroke-width="1.8" stroke-linecap="round"/>';
    return s + '</g>';
  }

  function signboard(name, roof) {
    const len = name.length;
    const fs = Math.min(19, 280 / len);
    if (roof === 'awning') {
      let s = rect(50, 52, 4, 16, `fill="${WOOD_DK}"`) + rect(186, 52, 4, 16, `fill="${WOOD_DK}"`);
      s += rect(26, 16, 188, 40, `rx="4" fill="${WOOD_DK}"`);
      s += rect(31, 21, 178, 30, `rx="2.5" fill="#efe3c8"`);
      s += `<text x="120" y="${n(36 + fs * 0.36)}" text-anchor="middle" class="stall-name" font-size="${n(fs)}">${esc(name)}</text>`;
      return s;
    }
    let s = line2(58, 112, 58, 120) + line2(182, 112, 182, 120);
    s += rect(34, 118, 172, 34, `rx="4" fill="${WOOD_DK}"`);
    s += rect(39, 122, 162, 26, `rx="2.5" fill="#efe3c8"`);
    s += `<text x="120" y="${n(135 + fs * 0.36)}" text-anchor="middle" class="stall-name" font-size="${n(Math.min(fs, 17))}">${esc(name)}</text>`;
    return s;
  }

  /* ---------------- the stall ---------------- */
  TH.renderStall = function (b) {
    const c = b.colors;
    const gable = b.roof === 'gable';
    const backTop = gable ? 112 : 104;
    const shelf = goods[b.display + 'Shelf'] ? goods[b.display + 'Shelf'](c) : '';
    let s = `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="awnShade-${b.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
      </defs>`;
    s = s.replace(`awnShade-${b.id}`, 'awnShade'); // shared id is fine: identical definition
    s += ell(120, 314, 124, 7, 'fill="rgba(30,20,10,.25)"');
    // back posts + backdrop
    s += rect(14, 66, 10, 244, `fill="${WOOD}"`) + rect(216, 66, 10, 244, `fill="${WOOD}"`);
    s += rect(14, 66, 3, 244, 'fill="rgba(255,255,255,.15)"') + rect(223, 66, 3, 244, 'fill="rgba(0,0,0,.18)"');
    s += rect(24, backTop, 192, COUNTER_Y - backTop, `fill="${c[1]}"`);
    for (let x = 40; x < 216; x += 22) s += rect(x, backTop, 1.5, COUNTER_Y - backTop, 'fill="rgba(0,0,0,.06)"');
    s += rect(24, backTop, 192, 26, 'fill="rgba(0,0,0,.12)"');
    // shelf goods (or items hung on the backdrop)
    if (shelf && shelf.back) s += shelf.svg;
    else if (shelf) s += rect(28, SHELF_Y, 184, 6, `fill="${WOOD_LT}"`) + rect(28, SHELF_Y + 6, 184, 3, 'fill="rgba(0,0,0,.2)"') + shelf;
    // roof
    s += gable ? gableRoof() : awningRoof(c);
    // lantern hanging under the roof
    s += `<g transform="translate(196,${gable ? 114 : 112})">${line2(0, 0, 0, 8)}<rect x="-6" y="8" width="12" height="15" rx="2" class="stall-lantern"/><rect x="-7" y="6" width="14" height="3" fill="#2a2826"/><circle cx="0" cy="16" r="26" class="lantern-glow"/></g>`;
    // counter goods, counter, cloth
    s += goods[b.display](c);
    s += rect(6, COUNTER_Y, 228, 10, `fill="${WOOD_LT}"`) + rect(6, COUNTER_Y + 8, 228, 2, 'fill="rgba(0,0,0,.2)"');
    s += `<path d="M10,${COUNTER_Y + 10} H230 V${COUNTER_Y + 62} ${Array.from({ length: 11 }, (_, i) => `q-10,9 -20,0`).join(' ')} Z" fill="${c[2]}"/>`;
    s += rect(10, COUNTER_Y + 10, 220, 6, 'fill="rgba(0,0,0,.18)"');
    s += `<path d="M10,${COUNTER_Y + 26} H230" stroke="${c[1]}" stroke-opacity=".5" stroke-width="2" stroke-dasharray="6 4"/>`;
    s += rect(18, COUNTER_Y + 68, 8, 16, `fill="${WOOD_DK}"`) + rect(214, COUNTER_Y + 68, 8, 16, `fill="${WOOD_DK}"`);
    s += signboard(b.name, b.roof);
    // demo ribbon
    s += `<g transform="${gable ? 'translate(176,150)' : 'translate(186,10)'}"><rect width="38" height="14" rx="2" class="demo-chip"/><text x="19" y="10.2" text-anchor="middle" font-size="8.5" class="stall-small demo-chip-text" letter-spacing="1.4">DEMO</text></g>`;
    s += categoryTag(b.category);
    // little chalkboard on the ground
    if (b.chalk) {
      s += `<g transform="translate(184,262)"><path d="M4,52 L12,0 M44,52 L36,0" stroke="${WOOD_DK}" stroke-width="3"/><rect x="6" y="2" width="36" height="32" rx="2" fill="#2f3431" stroke="${WOOD_LT}" stroke-width="3"/>`;
      const words = b.chalk.split(' ');
      words.slice(0, 2).forEach((w, i) => (s += `<text x="24" y="${n(15 + i * 11)}" text-anchor="middle" font-size="${n(Math.min(9, 62 / w.length))}" class="chalk">${esc(w)}</text>`));
      s += '</g>';
    }
    return s + '</svg>';
  };

  /* An empty slot: shows that the street has room, and that listings are free. */
  TH.renderEmptyStall = function () {
    return `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      ${ell(120, 314, 120, 6, 'fill="rgba(30,20,10,.18)"')}
      ${rect(14, 80, 10, 230, `fill="${WOOD}" opacity=".75"`)}${rect(216, 80, 10, 230, `fill="${WOOD}" opacity=".75"`)}
      ${rect(14, 80, 212, 8, `fill="${WOOD}" opacity=".75"`)}
      ${rect(6, COUNTER_Y, 228, 10, `fill="${WOOD_LT}" opacity=".8"`)}
      ${rect(18, COUNTER_Y + 10, 8, 74, `fill="${WOOD_DK}" opacity=".7"`)}${rect(214, COUNTER_Y + 10, 8, 74, `fill="${WOOD_DK}" opacity=".7"`)}
      <rect x="40" y="118" width="160" height="78" rx="6" fill="#efe3c8" stroke="${WOOD_DK}" stroke-width="4"/>
      <text x="120" y="148" text-anchor="middle" class="stall-name" font-size="17">This stall is open</text>
      <text x="120" y="170" text-anchor="middle" class="stall-small" font-size="9.5" fill="#6b4a32" letter-spacing="1.6">LISTINGS ARE ALWAYS FREE</text>
      ${line2(70, 88, 70, 118)}${line2(170, 88, 170, 118)}
    </svg>`;
  };

  /* Larger product illustration for the profile's photo placeholders. */
  TH.renderGoodsVignette = function (b) {
    const shelf = goods[b.display + 'Shelf'] ? goods[b.display + 'Shelf'](b.colors) : '';
    return `<svg viewBox="20 ${shelf && shelf.back ? 100 : 130} 200 ${shelf && shelf.back ? 130 : 100}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect x="0" y="0" width="240" height="320" fill="${b.colors[1]}"/>
      ${shelf && shelf.back ? shelf.svg : ''}${goods[b.display](b.colors)}
      <rect x="0" y="${COUNTER_Y}" width="240" height="20" fill="#b38a60"/></svg>`;
  };
})();
