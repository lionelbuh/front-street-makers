/*
 * CROWD — visitors strolling the promenade in front of the stalls, plus the
 * paid "ad carriers" (sign juggler and balloon kid) that cross the view every
 * two minutes, alternating.
 *
 * Like the stalls, the crowd is its own layer: it reads the street's slots but
 * never draws on the street. Visitors are decorative (no pointer events);
 * ad carriers are real links marked SPONSOR with rel="sponsored".
 */
(function () {
  'use strict';
  const TH = window.TH;
  const { W, H, STALL_BOTTOM, slots } = TH.STREET;
  const n = (v) => Math.round(v * 10) / 10;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const LANE_FAR = STALL_BOTTOM + 34; // feet of the farthest lane (just in front of the counters)
  const LANE_NEAR = H - 8; // feet of the nearest lane
  const AD_EVERY_MS = 120000;
  const FIRST_AD_MS = 5000;

  const SKIN = ['#f1c9a5', '#e0ac85', '#c68a62', '#9a6544', '#6e4630', '#f5d6bd', '#b47a55'];
  const HAIR = ['#2b1d14', '#4a2f1d', '#7a4f2a', '#c9a063', '#9b9a94', '#1c1a18', '#a3462b', '#d8c7a0'];
  const TOPS = ['#c8573f', '#3f6c8c', '#e9c46a', '#5c7f48', '#f2efe4', '#6b2d45', '#2f5a4a', '#d98b5f', '#7c8f9c', '#b5563f', '#e7a1a6', '#4e6e7e'];
  const BOTTOMS = ['#2f3a4a', '#4b4a46', '#7a6a55', '#3b4f6b', '#c9b99a', '#2a2826', '#5a6b7a'];

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  function darker(hex, amt = 0.22) {
    const c = hex.replace('#', '');
    return '#' + [0, 2, 4].map((i) => Math.round(parseInt(c.substr(i, 2), 16) * (1 - amt)).toString(16).padStart(2, '0')).join('');
  }

  /* ------------------------------------------------------------------
     One person, side view, facing right, feet at y = 0.
     Legs (.lg1/.lg2) and arms (.ar1/.ar2) swing while the group walks.
     ------------------------------------------------------------------ */
  function person(o) {
    const child = o.kind === 'child';
    const k = child ? 0.6 : 1;
    const hip = -70 * k, sh = -121 * k;
    const hr = child ? 10 : 11.5;
    const hy = sh - hr - 3 * k;
    const legW = child ? 7 : 9.5, tw = child ? 20 : 27;
    const hx = 2;
    let s = `<g transform="translate(${n(o.x)},0)">`;

    // long hair falls behind the shoulders
    if (o.hairStyle === 'long') s += `<rect x="${n(hx - hr - 1)}" y="${n(hy - 2)}" width="${n(hr * 1.1)}" height="${n(hr * 2.2)}" rx="${n(hr * 0.5)}" fill="${o.hair}"/>`;

    // back arm and back leg (darker)
    const armL = 46 * k;
    const arm = (cls, col) => `<g class="${cls}"><rect x="-3.5" y="${n(sh + 3)}" width="${n(child ? 6 : 7.5)}" height="${n(armL)}" rx="3.5" fill="${col}"/><circle cx="0.3" cy="${n(sh + 3 + armL)}" r="${n(child ? 3.2 : 4.2)}" fill="${o.skin}"/></g>`;
    const legCol = o.dress ? o.skin : o.bottom;
    const leg = (cls, col) => `<g class="${cls}"><rect x="${n(-legW / 2)}" y="${n(hip)}" width="${n(legW)}" height="${n(-hip - 3)}" rx="${n(legW / 2.4)}" fill="${col}"/><path d="M${n(-legW / 2 - 0.5)},-4.5 h${n(legW + 6 * k)} q3.2,0 3.2,4.5 h${n(-legW - 9 * k)} Z" fill="${o.shoe || '#2a2522'}"/></g>`;
    if (!o.raiseBack) s += arm('ar2', darker(o.top, 0.25));
    s += leg('lg2', darker(legCol, 0.2));
    s += leg('lg1', legCol);

    // torso (or dress)
    const bottom = o.dress ? hip + 30 * k : hip + 3;
    const flare = o.dress ? 7 * k : 1;
    s += `<path d="M${n(-tw / 2)},${n(sh + 5)} Q${n(-tw / 2)},${n(sh)} ${n(-tw / 2 + 6)},${n(sh)} H${n(tw / 2 - 6)} Q${n(tw / 2)},${n(sh)} ${n(tw / 2)},${n(sh + 5)} L${n(tw / 2 + flare)},${n(bottom)} H${n(-tw / 2 - flare)} Z" fill="${o.top}"/>`;
    if (o.stripe) s += `<path d="M${n(-tw / 2)},${n(sh + 22 * k)} H${n(tw / 2 + 0.5)}" stroke="${o.stripe}" stroke-width="${n(4 * k)}"/>`;
    if (!o.dress) s += `<rect x="${n(-tw / 2 - 1)}" y="${n(hip - 2)}" width="${n(tw + 2)}" height="${n(6 * k)}" fill="${darker(o.bottom, 0.1)}"/>`;

    // tote bag on the shoulder
    if (o.bag) {
      s += `<path d="M${n(-tw / 2 + 4)},${n(sh + 2)} L${n(-tw / 2 - 2)},${n(hip - 10)}" stroke="${darker(o.bag, 0.3)}" stroke-width="2" fill="none"/>`;
      s += `<path d="M${n(-tw / 2 - 12)},${n(hip - 12)} h20 l-2,24 h-16 Z" fill="${o.bag}"/>`;
      if (o.bagFlowers) for (let i = 0; i < 4; i++) s += `<circle cx="${n(-tw / 2 - 8 + i * 4)}" cy="${n(hip - 14 - (i % 2) * 3)}" r="2.6" fill="${['#e86f8a', '#f2c14e', '#f4efe4', '#d9415a'][i]}"/>`;
    }

    // neck, head, face
    s += `<rect x="${n(hx - 3)}" y="${n(sh - 6)}" width="6" height="8" fill="${o.skin}"/>`;
    s += `<circle cx="${hx}" cy="${n(hy)}" r="${hr}" fill="${o.skin}"/>`;
    s += `<circle cx="${n(hx + hr - 0.5)}" cy="${n(hy + 1.5)}" r="2.2" fill="${o.skin}"/>`;
    s += `<circle cx="${n(hx + hr * 0.45)}" cy="${n(hy - 1.5)}" r="1.25" fill="#2a2420"/>`;
    // hair
    if (o.hairStyle !== 'bald') {
      s += `<path d="M${n(hx - hr - 1)},${n(hy + 2)} A${n(hr + 1)},${n(hr + 1)} 0 0 1 ${n(hx + hr + 1)},${n(hy - 2)} Q${n(hx + hr * 0.2)},${n(hy - hr * 0.55)} ${n(hx - hr * 0.35)},${n(hy - hr * 0.15)} L${n(hx - hr * 0.55)},${n(hy + hr * 0.55)} Z" fill="${o.hair}"/>`;
      if (o.hairStyle === 'bun') s += `<circle cx="${n(hx - hr * 0.7)}" cy="${n(hy - hr * 0.85)}" r="${n(hr * 0.42)}" fill="${o.hair}"/>`;
      if (o.hairStyle === 'pony') s += `<path d="M${n(hx - hr * 0.8)},${n(hy - hr * 0.4)} q-9,4 -7,16" stroke="${o.hair}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    } else {
      s += `<path d="M${n(hx - hr)},${n(hy + 2)} A${hr},${hr} 0 0 1 ${n(hx - hr * 0.2)},${n(hy - hr * 0.9)}" stroke="${o.hair}" stroke-width="3" fill="none"/>`;
    }
    // hats
    if (o.hat === 'sun') s += `<ellipse cx="${hx}" cy="${n(hy - hr * 0.45)}" rx="${n(hr * 1.75)}" ry="3" fill="${o.hatColor || '#e8d7a8'}"/><path d="M${n(hx - hr * 0.85)},${n(hy - hr * 0.45)} Q${hx},${n(hy - hr * 1.7)} ${n(hx + hr * 0.85)},${n(hy - hr * 0.45)} Z" fill="${o.hatColor || '#e8d7a8'}"/><rect x="${n(hx - hr * 0.85)}" y="${n(hy - hr * 0.75)}" width="${n(hr * 1.7)}" height="3" fill="${o.hatBand || '#c8573f'}"/>`;
    if (o.hat === 'cap') s += `<path d="M${n(hx - hr)},${n(hy - 1)} A${hr},${hr} 0 0 1 ${n(hx + hr)},${n(hy - 1)} Z" fill="${o.hatColor || '#2f5a4a'}"/><path d="M${n(hx + hr * 0.6)},${n(hy - 2)} h${n(hr * 0.9)} q1,3 -2,3 h${n(-hr * 0.9)} Z" fill="${o.hatColor || '#2f5a4a'}"/>`;
    if (o.hat === 'cowboy') s += `<path d="M${n(hx - hr * 1.9)},${n(hy - hr * 0.35)} Q${hx},${n(hy - hr * 0.1)} ${n(hx + hr * 1.9)},${n(hy - hr * 0.35)} Q${hx},${n(hy - hr * 0.75)} ${n(hx - hr * 1.9)},${n(hy - hr * 0.35)} Z M${n(hx - hr * 0.8)},${n(hy - hr * 0.5)} Q${n(hx - hr * 0.6)},${n(hy - hr * 1.7)} ${hx},${n(hy - hr * 1.35)} Q${n(hx + hr * 0.6)},${n(hy - hr * 1.7)} ${n(hx + hr * 0.8)},${n(hy - hr * 0.5)} Z" fill="${o.hatColor || '#8a6142'}"/>`;
    if (o.glasses) s += `<path d="M${n(hx + hr * 0.2)},${n(hy - 1.5)} h${n(hr * 0.7)}" stroke="#2a2420" stroke-width="2"/>`;

    // front arm (or raised arm holding something)
    if (o.raise) s += `<g><path d="M${n(1)},${n(sh + 5)} L${n(o.raise.x)},${n(o.raise.y)}" stroke="${darker(o.top, 0.05)}" stroke-width="${child ? 6 : 7.5}" stroke-linecap="round"/><circle cx="${n(o.raise.x)}" cy="${n(o.raise.y)}" r="${child ? 3.4 : 4.4}" fill="${o.skin}"/></g>`;
    else s += arm('ar1', o.top);
    if (o.cane) s += `<path d="M${n(8)},${n(sh + 3 + armL)} L${n(12)},0 M${n(8)},${n(sh + 3 + armL)} q0,-6 6,-6" stroke="#5a4130" stroke-width="2.6" fill="none"/>`;
    return s + '</g>';
  }

  function dog(x, r) {
    const fur = pick(r, ['#c9a063', '#3a2e28', '#f2efe4', '#8a5a3a']);
    let s = `<g transform="translate(${x},0)">`;
    s += `<g class="lg2"><rect x="-16" y="-20" width="5" height="20" rx="2" fill="${darker(fur, 0.2)}"/></g><g class="lg1"><rect x="10" y="-20" width="5" height="20" rx="2" fill="${darker(fur, 0.2)}"/></g>`;
    s += `<g class="lg1"><rect x="-12" y="-20" width="5" height="20" rx="2" fill="${fur}"/></g><g class="lg2"><rect x="14" y="-20" width="5" height="20" rx="2" fill="${fur}"/></g>`;
    s += `<ellipse cx="0" cy="-24" rx="22" ry="10" fill="${fur}"/>`;
    s += `<path d="M-20,-28 q-10,-6 -12,-14" stroke="${fur}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    s += `<circle cx="22" cy="-34" r="9" fill="${fur}"/><ellipse cx="30" cy="-31" rx="6" ry="4.5" fill="${fur}"/><circle cx="35" cy="-32" r="1.8" fill="#2a2420"/><path d="M18,-40 q-4,8 2,12" fill="${darker(fur, 0.3)}"/><circle cx="24" cy="-36" r="1.2" fill="#2a2420"/>`;
    return s + '</g>';
  }

  function stroller(x, r) {
    const c = pick(r, ['#3f6c8c', '#6b2d45', '#5c7f48', '#2f3a4a']);
    return `<g transform="translate(${x},0)"><path d="M-30,-58 L-20,-22 H18 L22,-40" stroke="#3a3632" stroke-width="3" fill="none"/>
      <path d="M-18,-26 H20 Q24,-50 4,-58 Q-14,-58 -18,-40 Z" fill="${c}"/><path d="M4,-58 Q24,-56 22,-36 L4,-36 Z" fill="${darker(c, 0.25)}"/>
      <circle cx="-14" cy="-8" r="7.5" fill="none" stroke="#2a2826" stroke-width="3"/><circle cx="16" cy="-8" r="7.5" fill="none" stroke="#2a2826" stroke-width="3"/></g>`;
  }

  /* ------------------------------------------------------------------
     Groups: singles, couples, families, grandparents, dog walkers
     ------------------------------------------------------------------ */
  function adult(r, extra = {}) {
    const dress = r() < 0.3;
    return Object.assign({
      kind: 'adult', skin: pick(r, SKIN), hair: pick(r, HAIR), top: pick(r, TOPS), bottom: pick(r, BOTTOMS),
      dress, hairStyle: dress ? pick(r, ['long', 'bun', 'pony', 'short']) : pick(r, ['short', 'short', 'bald', 'long', 'bun']),
      hat: r() < 0.28 ? pick(r, ['sun', 'cap', 'cowboy']) : null,
      bag: r() < 0.35 ? pick(r, ['#d9c7a3', '#efe6d2', '#b08a52']) : null, bagFlowers: r() < 0.4,
      stripe: r() < 0.25 ? pick(r, ['#f4efe4', '#2a2826']) : null, glasses: r() < 0.2
    }, extra);
  }
  function kid(r, extra = {}) {
    return Object.assign({
      kind: 'child', skin: pick(r, SKIN), hair: pick(r, HAIR), top: pick(r, TOPS), bottom: pick(r, BOTTOMS),
      dress: r() < 0.35, hairStyle: pick(r, ['short', 'pony', 'long', 'short']), hat: r() < 0.25 ? 'cap' : null,
      stripe: r() < 0.4 ? '#f4efe4' : null
    }, extra);
  }

  function makeGroup(type, r) {
    const parts = [];
    let extra = '';
    if (type === 'single') parts.push(adult(r, { x: 0 }));
    if (type === 'couple') {
      const shared = { skin: pick(r, SKIN) };
      parts.push(adult(r, { x: 0 }), adult(r, { x: 32, skin: r() < 0.5 ? shared.skin : pick(r, SKIN) }));
    }
    if (type === 'family') {
      const skin = pick(r, SKIN);
      parts.push(adult(r, { x: 0, skin }), kid(r, { x: 30, skin }), adult(r, { x: 58, skin: r() < 0.6 ? skin : pick(r, SKIN) }));
      if (r() < 0.5) parts.push(kid(r, { x: 86, skin }));
    }
    if (type === 'grand') parts.push(adult(r, { x: 0, hair: '#d6d3cc', hairStyle: r() < 0.5 ? 'bald' : 'short', cane: true, hat: r() < 0.5 ? 'sun' : null }), adult(r, { x: 30, hair: '#cfcac0', hairStyle: 'bun' }));
    if (type === 'dog') {
      parts.push(adult(r, { x: 0 }));
      extra = dog(58, r) + `<path d="M8,-80 Q40,-40 72,-34" stroke="#3a3632" stroke-width="1.2" fill="none"/>`;
    }
    if (type === 'stroller') {
      const skin = pick(r, SKIN);
      parts.push(adult(r, { x: 0, skin }));
      if (r() < 0.6) parts.push(adult(r, { x: -32, skin: pick(r, SKIN) }));
      extra = stroller(46, r);
    }
    const maxX = Math.max(...parts.map((p) => p.x)) + (type === 'dog' ? 100 : type === 'stroller' ? 80 : 30);
    const minX = Math.min(...parts.map((p) => p.x)) - 30;
    // draw back to front: the person farthest forward last
    const svg = extra + parts.sort((a, b) => a.x - b.x).map(person).join('');
    return { svg, minX, maxX, top: -170, bottom: 6 };
  }

  /* ------------------------------------------------------------------
     Ad carriers
     ------------------------------------------------------------------ */
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function signJuggler(sp, uid) {
    const brand = sp.colors.brand, cream = sp.colors.cream;
    const r = rng(7);
    let s = '';
    // the sign on its pole: tossed, spun and caught (.ad-sign animation)
    s += `<g class="ad-sign">`;
    s += `<rect x="20" y="-300" width="5" height="190" rx="2" fill="#7a5638"/>`;
    s += `<g transform="translate(22,-300)">`;
    s += `<rect x="-74" y="-104" width="148" height="112" rx="6" fill="${cream}" stroke="${brand}" stroke-width="6"/>`;
    s += `<clipPath id="sgn-${uid}"><rect x="-64" y="-94" width="128" height="66" rx="3"/></clipPath>`;
    s += `<image href="${sp.images.sign}" x="-64" y="-94" width="128" height="66" preserveAspectRatio="xMidYMid slice" clip-path="url(#sgn-${uid})"/>`;
    s += `<rect x="-64" y="-100" width="44" height="13" rx="2" fill="#b3121a"/><text x="-42" y="-90.5" text-anchor="middle" font-size="8.5" class="ad-tag">SPONSOR</text>`;
    s += `<text x="0" y="-10" text-anchor="middle" font-size="13.5" class="ad-label" fill="${brand}">${esc(sp.label)}</text>`;
    s += `</g></g>`;
    // the juggler: cap, bright shirt, one arm up on the pole
    s += person({ kind: 'adult', x: 0, skin: pick(r, SKIN), hair: '#2b1d14', top: '#f2c14e', stripe: brand, bottom: '#2f3a4a', hat: 'cap', hatColor: brand, hairStyle: 'short', raise: { x: 22, y: -140 } });
    // three juggling balls with the other hand
    s += `<g class="ad-balls"><circle class="b1" cx="-14" cy="-150" r="5" fill="#c8423b"/><circle class="b2" cx="-4" cy="-170" r="5" fill="${brand}"/><circle class="b3" cx="-24" cy="-165" r="5" fill="#3f6c8c"/></g>`;
    return { svg: s, minX: -90, maxX: 110, top: -420, bottom: 6 };
  }

  function balloonKid(sp, uid) {
    const brand = sp.colors.brand, cream = sp.colors.cream;
    const r = rng(11);
    let s = '';
    s += `<g class="ad-balloon">`;
    s += `<path d="M18,-96 C30,-140 6,-180 26,-226" stroke="#6b6560" stroke-width="1.6" fill="none"/>`;
    s += `<g transform="translate(26,-300)">`;
    s += `<path d="M0,74 l-7,10 h14 Z" fill="${brand}"/>`;
    s += `<ellipse cx="0" cy="0" rx="66" ry="76" fill="${brand}"/>`;
    s += `<clipPath id="bln-${uid}"><circle cx="0" cy="-10" r="52"/></clipPath>`;
    s += `<circle cx="0" cy="-10" r="56" fill="${cream}"/>`;
    s += `<image href="${sp.images.balloon}" x="-52" y="-62" width="104" height="104" preserveAspectRatio="xMidYMid slice" clip-path="url(#bln-${uid})"/>`;
    s += `<path d="M-70,30 Q0,52 70,30 L66,52 Q0,74 -66,52 Z" fill="${cream}"/>`;
    s += `<text x="0" y="52" text-anchor="middle" font-size="11.5" class="ad-label" fill="${brand}">${esc(sp.label)}</text>`;
    s += `<rect x="-22" y="-78" width="44" height="13" rx="2" fill="#b3121a"/><text x="0" y="-68.5" text-anchor="middle" font-size="8.5" class="ad-tag">SPONSOR</text>`;
    s += `<ellipse cx="-30" cy="-40" rx="9" ry="16" fill="#fff" opacity=".35" transform="rotate(20 -30 -40)"/>`;
    s += `</g></g>`;
    s += person({ kind: 'child', x: 0, skin: pick(r, SKIN), hair: '#c9a063', hairStyle: 'pony', top: '#e7a1a6', stripe: '#f4efe4', bottom: '#3b4f6b', dress: false, raise: { x: 18, y: -96 } });
    return { svg: s, minX: -80, maxX: 100, top: -390, bottom: 6 };
  }

  /* ------------------------------------------------------------------
     Layer + animation
     ------------------------------------------------------------------ */
  const layer = document.getElementById('layer-crowd');
  const track = document.getElementById('track');
  const street = document.getElementById('street');
  const businessSlots = slots.slice(0, TH.DEMO_BUSINESSES.length);
  const groups = [];
  let uid = 0;

  function place(g) {
    const s = g.depth;
    const wUnits = (g.shape.maxX - g.shape.minX) * s;
    const hUnits = (g.shape.bottom - g.shape.top) * s;
    g.el.style.width = (wUnits / W) * 100 + '%';
    g.el.style.height = (hUnits / H) * 100 + '%';
    g.el.style.top = ((g.footY + g.shape.top * s) / H) * 100 + '%';
    g.el.style.zIndex = String(Math.round(g.footY) + (g.ad ? 200 : 0));
  }

  function createEl(shape, isAd, sponsor) {
    const el = document.createElement(isAd ? 'a' : 'div');
    el.className = 'walker' + (isAd ? ' walker--ad' : '');
    const vb = `${shape.minX} ${shape.top} ${shape.maxX - shape.minX} ${shape.bottom - shape.top}`;
    el.innerHTML = `<svg viewBox="${vb}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><g class="figure">${shape.svg}</g></svg>`;
    if (isAd) {
      el.href = sponsor.url;
      el.target = '_blank';
      el.rel = 'sponsored noopener';
      el.setAttribute('aria-label', `Sponsor: ${sponsor.name}, ${sponsor.label} (opens in a new tab)`);
    }
    layer.appendChild(el);
    return el;
  }

  function setDir(g, dir) {
    g.dir = dir;
    g.el.classList.toggle('walker--left', dir < 0);
  }
  function setWalking(g, on) {
    g.walking = on;
    g.el.classList.toggle('walking', on && !reduceMotion.matches);
  }

  function spawnVisitor(i, r) {
    const type = pick(r, ['single', 'single', 'couple', 'couple', 'family', 'family', 'grand', 'dog', 'stroller']);
    const shape = makeGroup(type, r);
    const footY = LANE_FAR + r() * (LANE_NEAR - LANE_FAR - 26);
    const g = {
      shape, footY, depth: 0.86 + ((footY - LANE_FAR) / (LANE_NEAR - LANE_FAR)) * 0.2,
      x: 1650 + r() * (W - 2100), speed: (type === 'grand' ? 34 : type === 'family' ? 46 : 52) + r() * 22,
      stopUntil: 0, lastSlot: -1, ad: false
    };
    g.el = createEl(shape, false);
    setDir(g, r() < 0.5 ? 1 : -1);
    setWalking(g, true);
    place(g);
    groups.push(g);
  }

  const r0 = rng(2026);
  const VISITORS = 14;
  for (let i = 0; i < VISITORS; i++) spawnVisitor(i, r0);

  /* ---------- ad carriers: every 2 minutes, alternating ---------- */
  let adCount = 0;
  let activeAd = null;
  function view() {
    const sc = track.clientWidth / W;
    return { left: street.scrollLeft / sc, right: (street.scrollLeft + street.clientWidth) / sc };
  }
  function spawnAd(staticPose) {
    if (activeAd || !TH.SPONSORS || !TH.SPONSORS.length) return;
    const sponsor = TH.SPONSORS[Math.floor(adCount / 2) % TH.SPONSORS.length];
    const kind = adCount % 2 === 0 ? 'sign' : 'balloon';
    adCount++;
    const shape = kind === 'sign' ? signJuggler(sponsor, ++uid) : balloonKid(sponsor, ++uid);
    const v = view();
    const fromLeft = true; // always walk left to right so the sign reads correctly
    const g = {
      shape, footY: LANE_NEAR - 2, depth: kind === 'sign' ? 1.45 : 1.5, ad: true, kind,
      speed: kind === 'sign' ? 62 : 50, stopUntil: 0, lastSlot: -1, pauseDone: false, born: performance.now()
    };
    g.el = createEl(shape, true, sponsor);
    g.el.classList.add(kind === 'sign' ? 'ad--sign' : 'ad--balloon');
    if (staticPose) {
      g.x = Math.max(v.left + (v.right - v.left) * 0.62, 900);
      setDir(g, 1);
      setWalking(g, false);
    } else {
      g.x = fromLeft ? v.left - shape.maxX * g.depth - 20 : v.right - shape.minX * g.depth + 20;
      setDir(g, fromLeft ? 1 : -1);
      setWalking(g, true);
    }
    place(g);
    groups.push(g);
    activeAd = g;
  }
  function removeGroup(g) {
    g.el.remove();
    groups.splice(groups.indexOf(g), 1);
    if (g === activeAd) activeAd = null;
  }

  /* ---------- the loop ---------- */
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.06, (now - last) / 1000);
    last = now;
    const sc = track.clientWidth / W;
    const v = view();
    for (let i = groups.length - 1; i >= 0; i--) {
      const g = groups[i];
      if (!g.walking) {
        if (g.stopUntil && now > g.stopUntil) { g.stopUntil = 0; setWalking(g, true); }
      } else {
        const prev = g.x;
        g.x += g.dir * g.speed * dt;
        if (g.ad) {
          // the ad carrier pauses once near the middle of the view to perform
          const mid = (v.left + v.right) / 2;
          if (!g.pauseDone && (prev - mid) * (g.x - mid) <= 0) {
            g.pauseDone = true;
            setWalking(g, false);
            g.stopUntil = now + (g.kind === 'sign' ? 11000 : 7000);
          }
          const gone = g.dir > 0 ? g.x + g.shape.minX * g.depth > v.right + 200 : g.x + g.shape.maxX * g.depth < v.left - 200;
          if ((g.pauseDone && gone) || now - g.born > 150000) { removeGroup(g); continue; }
        } else {
          // visitors sometimes stop in front of a stall
          for (const slot of businessSlots) {
            if (slot.index !== g.lastSlot && (prev - slot.x) * (g.x - slot.x) <= 0) {
              g.lastSlot = slot.index;
              if (Math.random() < 0.42) {
                setWalking(g, false);
                g.stopUntil = now + 2500 + Math.random() * 6500;
              }
            }
          }
          if (g.x < 1560 && g.dir < 0) setDir(g, 1);
          if (g.x > W - 380 && g.dir > 0) setDir(g, -1);
        }
      }
      g.el.style.transform = `translate3d(${n((g.x + g.shape.minX * g.depth) * sc)}px,0,0)`;
    }
    if (!reduceMotion.matches) requestAnimationFrame(tick);
  }

  if (reduceMotion.matches) {
    // still picture: everyone stands, the sign carrier waits near the first stalls
    groups.forEach((g) => setWalking(g, false));
    spawnAd(true);
    tick(performance.now());
    window.addEventListener('resize', () => tick(performance.now()));
  } else {
    requestAnimationFrame(tick);
    setTimeout(() => spawnAd(false), FIRST_AD_MS);
    setInterval(() => { if (!document.hidden) spawnAd(false); }, AD_EVERY_MS);
  }

  // handle for the future admin preview (show the next ad carrier now)
  TH.crowd = { showNextAd() { if (activeAd) removeGroup(activeAd); spawnAd(false); } };

  /* ---------- the always-available sponsor line under the street ---------- */
  const line = document.getElementById('sponsor-line');
  if (line && TH.SPONSORS && TH.SPONSORS.length) {
    const sp = TH.SPONSORS[0];
    line.innerHTML = `<span class="chip chip--sponsor">Sponsor</span> <a href="${sp.url}" target="_blank" rel="sponsored noopener">${esc(sp.label)}</a> <span class="sponsor-tagline">${esc(sp.tagline)}</span>`;
    line.hidden = false;
  }
})();
