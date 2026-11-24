/*
 * DAILY FEATURED ROTATION — shared by the website and the API worker.
 *
 * Pure functions, no I/O. Given the approved businesses, the admin settings and
 * a date, decide which businesses stand on the illustrated street that day.
 *
 * Fairness rules
 *   1. Manual pins first: the admin can feature a business on chosen dates.
 *   2. New businesses next: anyone approved in the last `newDays` days gets
 *      initial visibility (at most `newMax` of them per day, newest first).
 *   3. Everyone else rotates through a stable shuffled order. Each day takes the
 *      next window of the order, so every business is featured once per cycle
 *      before anyone repeats. `seed` reshuffles the order when the admin wants.
 * Every approved business stays in the directory whether featured or not.
 */

export const STREET_SLOTS = 12;
export const MAX_FEATURED = 10; // always leaves at least two "open stall" slots
export const DEFAULT_SETTINGS = Object.freeze({ count: 8, newDays: 14, newMax: 3, seed: 'temecula', pins: [] });

/** Small stable string hash (FNV-1a, 32 bit). */
export function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Days since 1970-01-01 for a YYYY-MM-DD string (calendar day, no time zone). */
export function dayNumber(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** Today's date (YYYY-MM-DD) in Temecula's time zone. */
export function todayInTemecula(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDays(dateStr, n) {
  const d = new Date((dayNumber(dateStr) + n) * 86400000);
  return d.toISOString().slice(0, 10);
}

export function normalizeSettings(s = {}) {
  const out = { ...DEFAULT_SETTINGS, ...s };
  out.count = Math.min(MAX_FEATURED, Math.max(1, Math.round(Number(out.count) || DEFAULT_SETTINGS.count)));
  out.newDays = Math.max(0, Math.round(Number(out.newDays) || 0));
  out.newMax = Math.max(0, Math.min(out.count, Math.round(Number(out.newMax) || 0)));
  out.seed = String(out.seed || DEFAULT_SETTINGS.seed);
  out.pins = Array.isArray(out.pins) ? out.pins.filter((p) => p && p.id && p.from && p.to) : [];
  return out;
}

/**
 * @param {Array<{id:string, publishedAt?:string}>} businesses approved businesses
 * @param {object} settings see DEFAULT_SETTINGS; pins: [{id, from:'YYYY-MM-DD', to:'YYYY-MM-DD'}]
 * @param {string} date YYYY-MM-DD
 * @returns {{ids:string[], reasons:Object<string,'pinned'|'new'|'rotation'>}}
 */
export function featuredForDate(businesses, settings, date) {
  const s = normalizeSettings(settings);
  const byId = new Map(businesses.map((b) => [b.id, b]));
  const ids = [];
  const reasons = {};
  const add = (id, why) => {
    if (ids.length < s.count && byId.has(id) && !reasons[id]) {
      ids.push(id);
      reasons[id] = why;
    }
  };

  // 1. manual pins covering this date
  for (const p of s.pins) if (p.from <= date && date <= p.to) add(p.id, 'pinned');

  // 2. initial visibility for new businesses
  if (s.newDays > 0 && s.newMax > 0) {
    const today = dayNumber(date);
    const fresh = businesses
      .filter((b) => b.publishedAt)
      .map((b) => ({ id: b.id, age: today - dayNumber(String(b.publishedAt).slice(0, 10)) }))
      .filter((b) => b.age >= 0 && b.age < s.newDays)
      .sort((a, b) => a.age - b.age || (a.id < b.id ? -1 : 1));
    let taken = 0;
    for (const b of fresh) {
      if (taken >= s.newMax) break;
      if (!reasons[b.id]) { add(b.id, 'new'); taken++; }
    }
  }

  // 3. fair rotation through a stable shuffled order
  const order = businesses
    .map((b) => b.id)
    .sort((a, b) => hash(s.seed + '|' + a) - hash(s.seed + '|' + b) || (a < b ? -1 : 1));
  const n = order.length;
  if (n) {
    const start = ((dayNumber(date) * s.count) % n + n) % n;
    for (let k = 0; k < n && ids.length < s.count; k++) add(order[(start + k) % n], 'rotation');
  }
  return { ids, reasons };
}

/**
 * Where each featured business stands on the street. Open stalls are spread
 * evenly between them rather than bunched at the end.
 * @returns {Array<number|null>} length STREET_SLOTS; index into `featured` or null for an open stall
 */
export function streetPlan(featuredCount, slots = STREET_SLOTS) {
  const k = Math.min(featuredCount, slots);
  const open = slots - k;
  const openAt = new Set();
  for (let j = 1; j <= open; j++) openAt.add(Math.min(slots - 1, Math.round((j * slots) / (open + 0.5)) - 1));
  // if rounding collided, fill from the end
  for (let i = slots - 1; openAt.size < open && i >= 0; i--) openAt.add(i);
  const plan = [];
  let next = 0;
  for (let i = 0; i < slots; i++) plan.push(openAt.has(i) ? null : next++);
  return plan;
}
