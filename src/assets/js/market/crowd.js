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
    s += `<g transform="translate(22,-300)"><g class="unflip">`;
    s += `<rect x="-74" y="-104" width="148" height="112" rx="6" fill="${cream}" stroke="${brand}" stroke-width="6"/>`;
    s += `<clipPath id="sgn-${uid}"><rect x="-64" y="-94" width="128" height="66" rx="3"/></clipPath>`;
    s += `<image href="${sp.images.sign}" x="-64" y="-94" width="128" height="66" preserveAspectRatio="xMidYMid slice" clip-path="url(#sgn-${uid})"/>`;
    s += `<rect x="-64" y="-100" width="44" height="13" rx="2" fill="#b3121a"/><text x="-42" y="-90.5" text-anchor="middle" font-size="8.5" class="ad-tag">SPONSOR</text>`;
    s += `<text x="0" y="-10" text-anchor="middle" font-size="13.5" class="ad-label" fill="${brand}">${esc(sp.label)}</text>`;
    s += `</g></g></g>`;
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
    s += `<g transform="translate(26,-300)"><g class="unflip">`;
    s += `<path d="M0,74 l-7,10 h14 Z" fill="${brand}"/>`;
    s += `<ellipse cx="0" cy="0" rx="66" ry="76" fill="${brand}"/>`;
    s += `<clipPath id="bln-${uid}"><circle cx="0" cy="-10" r="52"/></clipPath>`;
    s += `<circle cx="0" cy="-10" r="56" fill="${cream}"/>`;
    s += `<image href="${sp.images.balloon}" x="-52" y="-62" width="104" height="104" preserveAspectRatio="xMidYMid slice" clip-path="url(#bln-${uid})"/>`;
    s += `<path d="M-70,30 Q0,52 70,30 L66,52 Q0,74 -66,52 Z" fill="${cream}"/>`;
    s += `<text x="0" y="52" text-anchor="middle" font-size="11.5" class="ad-label" fill="${brand}">${esc(sp.label)}</text>`;
    s += `<rect x="-22" y="-78" width="44" height="13" rx="2" fill="#b3121a"/><text x="0" y="-68.5" text-anchor="middle" font-size="8.5" class="ad-tag">SPONSOR</text>`;
    s += `<ellipse cx="-30" cy="-40" rx="9" ry="16" fill="#fff" opacity=".35" transform="rotate(20 -30 -40)"/>`;
    s += `</g></g></g>`;
    s += person({ kind: 'child', x: 0, skin: pick(r, SKIN), hair: '#c9a063', hairStyle: 'pony', top: '#e7a1a6', stripe: '#f4efe4', bottom: '#3b4f6b', dress: false, raise: { x: 18, y: -96 } });
    return { svg: s, minX: -80, maxX: 100, top: -390, bottom: 6 };
  }

  /* ------------------------------------------------------------------
     Layer + animation
     ------------------------------------------------------------------ */
  TH.mountCrowd = function mountCrowd(opts = {}) {
  const layer = document.getElementById('layer-crowd');
  const track = document.getElementById('track');
  const street = document.getElementById('street');
  if (!layer || !track || !street) return;
  const occupied = opts.occupiedSlots || [];
  const businessSlots = slots.filter((sl) => occupied.includes(sl.index));
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

  /* ---------- ad carriers ----------
     Timeline from the visitor's arrival:
       0 s    the sign juggler sets off from the far (right) end of the street,
              walking toward the entrance, so the visitor meets him while exploring
       60 s   the balloon kid sets off from the entrance (left), walking the other way
       then   every 2 minutes, alternating: juggler from the right, kid from the left
     Each carrier walks the whole street, pausing in front of a few stalls. */
  const STREET_START = 1450; // just past the gateway
  const STREET_END = W - 420;
  const FIRST_BALLOON_MS = 60000;
  let adCount = 0;
  const activeAds = [];
  function view() {
    const sc = track.clientWidth / W;
    return { left: street.scrollLeft / sc, right: (street.scrollLeft + street.clientWidth) / sc };
  }
  function spawnAd(kind, staticPose) {
    if (!TH.SPONSORS || !TH.SPONSORS.length) return;
    if (activeAds.some((g) => g.kind === kind)) return; // one of each at a time
    const sponsor = TH.SPONSORS[Math.floor(adCount / 2) % TH.SPONSORS.length];
    adCount++;
    const shape = kind === 'sign' ? signJuggler(sponsor, ++uid) : balloonKid(sponsor, ++uid);
    const g = {
      shape, footY: LANE_NEAR - 2, depth: kind === 'sign' ? 1.45 : 1.5, ad: true, kind,
      speed: kind === 'sign' ? 62 : 50, stopUntil: 0, lastSlot: -1, born: performance.now()
    };
    g.el = createEl(shape, true, sponsor);
    g.el.classList.add(kind === 'sign' ? 'ad--sign' : 'ad--balloon');
    if (staticPose) {
      const v = view();
      g.x = Math.max(v.left + (v.right - v.left) * 0.62, 900);
      setDir(g, 1);
      setWalking(g, false);
    } else if (kind === 'sign') {
      g.x = STREET_END; // from the right
      setDir(g, -1);
      setWalking(g, true);
    } else {
      g.x = STREET_START; // from the left
      setDir(g, 1);
      setWalking(g, true);
    }
    place(g);
    groups.push(g);
    activeAds.push(g);
  }
  function removeGroup(g) {
    g.el.remove();
    groups.splice(groups.indexOf(g), 1);
    const i = activeAds.indexOf(g);
    if (i >= 0) activeAds.splice(i, 1);
  }

  /* ---------- the loop ---------- */
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.06, (now - last) / 1000);
    last = now;
    const sc = track.clientWidth / W;
    for (let i = groups.length - 1; i >= 0; i--) {
      const g = groups[i];
      if (!g.walking) {
        if (g.stopUntil && now > g.stopUntil) { g.stopUntil = 0; setWalking(g, true); }
      } else {
        const prev = g.x;
        g.x += g.dir * g.speed * dt;
        // everyone may stop in front of a stall; ad carriers stop to perform
        for (const slot of businessSlots) {
          if (slot.index !== g.lastSlot && (prev - slot.x) * (g.x - slot.x) <= 0) {
            g.lastSlot = slot.index;
            const chance = g.ad ? 0.3 : 0.42;
            if (Math.random() < chance) {
              setWalking(g, false);
              g.stopUntil = now + (g.ad ? (g.kind === 'sign' ? 8000 : 4500) : 2500 + Math.random() * 6500);
            }
          }
        }
        if (g.ad) {
          const done = g.dir < 0 ? g.x < STREET_START - 250 : g.x > STREET_END + 250;
          if (done || now - g.born > 240000) { removeGroup(g); continue; }
        } else {
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
    spawnAd('sign', true);
    tick(performance.now());
    window.addEventListener('resize', () => tick(performance.now()));
  } else {
    requestAnimationFrame(tick);
    spawnAd('sign');
    setTimeout(() => {
      spawnAd('balloon');
      let next = 'sign';
      setInterval(() => {
        if (!document.hidden) spawnAd(next);
        next = next === 'sign' ? 'balloon' : 'sign';
      }, AD_EVERY_MS);
    }, FIRST_BALLOON_MS);
  }

  // handle for the future admin preview (send a carrier now)
  TH.crowd = {
    showNextAd(kind = 'sign') {
      activeAds.filter((g) => g.kind === kind).forEach(removeGroup);
      spawnAd(kind);
    }
  };

  /* ---------- a vintage hanging sign on the first lamp post after the arch ----------
     Wrought-iron bracket, enamel-style board in the sponsor's colours. */
  const POST_X = slots[0].x - 200; // the first street lamp
  function postSign(sp) {
    const brand = sp.colors.brand, cream = sp.colors.cream, gold = '#d6bf84';
    const a = document.createElement('a');
    a.className = 'post-sign';
    a.href = sp.url;
    a.target = '_blank';
    a.rel = 'sponsored noopener';
    a.setAttribute('aria-label', `Sponsor: ${sp.name}, ${sp.label} (opens in a new tab)`);
    const w = 222, h = 165; // drawing box
    const ws = 268, hs = 199, top = 352; // size on the street (world units)
    a.style.left = ((POST_X - 6 - ws) / W) * 100 + '%';
    a.style.top = (top / H) * 100 + '%';
    a.style.width = (ws / W) * 100 + '%';
    a.style.height = (hs / H) * 100 + '%';
    a.innerHTML = `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false">
      <rect x="10" y="5" width="${w - 10}" height="6" rx="2" fill="#2a2826"/>
      <circle cx="12" cy="8" r="5" fill="#2a2826"/>
      <path d="M${w},44 Q${w - 20},12 ${w - 78},11" fill="none" stroke="#2a2826" stroke-width="4"/>
      <path d="M${w - 30},11 C${w - 30},30 ${w - 58},34 ${w - 66},24 C${w - 72},16 ${w - 60},10 ${w - 56},18" fill="none" stroke="#2a2826" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M${w - 84},11 C${w - 92},26 ${w - 112},26 ${w - 114},16" fill="none" stroke="#2a2826" stroke-width="2.4" stroke-linecap="round"/>
      <g class="post-board">
        <path d="M34,11 V30 M186,11 V30" stroke="#2a2826" stroke-width="2" stroke-dasharray="3 1.6"/>
        <rect x="12" y="30" width="196" height="128" rx="8" fill="${brand}"/>
        <rect x="18" y="36" width="184" height="116" rx="5" fill="none" stroke="${gold}" stroke-width="1.6"/>
        <rect x="24" y="42" width="172" height="104" rx="4" fill="${cream}"/>
        <circle cx="110" cy="62" r="14" fill="${brand}"/>
        <g transform="translate(110,62) scale(.4) translate(-32,-34)">
          <path d="M14 40h36l-4 15H18z" fill="#DDE3D2"/>
          <path d="M32 9c1.5 2 1 4.5 3 7 5 6 15 10 15 20 0 4-2 6-4 6H18c-2 0-4-2-4-6 0-10 10-14 15-20 1.6-2 1.5-4 3-7z" fill="${cream}"/>
        </g>
        <text x="110" y="98" text-anchor="middle" class="post-title" font-size="22" fill="${brand}">Meringue Suisse</text>
        <path d="M54,106 H98 M122,106 H166" stroke="${gold}" stroke-width="1.4"/><path d="M110,102 l4,4 l-4,4 l-4,-4 Z" fill="${gold}"/>
        <text x="110" y="121" text-anchor="middle" class="post-small" font-size="7.6" fill="${brand}" letter-spacing="1.4">SWISS MERINGUES · TEMECULA</text>
        <text x="110" y="139" text-anchor="middle" class="post-url" font-size="13.5" fill="#2a2826">${esc(sp.label)} →</text>
        <rect x="16" y="22" width="48" height="14" rx="2" fill="#b3121a"/>
        <text x="40" y="32.3" text-anchor="middle" font-size="8.5" class="ad-tag">SPONSOR</text>
      </g>
    </svg>`;
    layer.appendChild(a);
  }
  if (TH.SPONSORS && TH.SPONSORS.length) postSign(TH.SPONSORS[0]);

  /* ---------- the always-available sponsor line under the street ---------- */
  const line = document.getElementById('sponsor-line');
  if (line && TH.SPONSORS && TH.SPONSORS.length) {
    const sp = TH.SPONSORS[0];
    line.innerHTML = `<span class="chip chip--sponsor">Sponsor</span> <a href="${sp.url}" target="_blank" rel="sponsored noopener">${esc(sp.label)}</a> <span class="sponsor-tagline">${esc(sp.tagline)}</span>`;
    line.hidden = false;
  }
  };
})();
