import { test } from 'node:test';
import assert from 'node:assert/strict';
import { featuredForDate, streetPlan, addDays, dayNumber, normalizeSettings, MAX_FEATURED } from '../src/assets/js/app/rotation.js';

const biz = (n, publishedAt = '2026-01-01') => Array.from({ length: n }, (_, i) => ({ id: `b${String(i).padStart(2, '0')}`, publishedAt }));

test('features the configured number of businesses', () => {
  const { ids } = featuredForDate(biz(30), { count: 8 }, '2026-11-24');
  assert.equal(ids.length, 8);
  assert.equal(new Set(ids).size, 8);
});

test('never features more than exist, and never more than the cap', () => {
  assert.equal(featuredForDate(biz(3), { count: 8 }, '2026-11-24').ids.length, 3);
  assert.equal(featuredForDate(biz(40), { count: 50 }, '2026-11-24').ids.length, MAX_FEATURED);
  assert.deepEqual(featuredForDate([], { count: 8 }, '2026-11-24').ids, []);
});

test('rotation is fair: everyone appears once before anyone repeats', () => {
  const all = biz(24);
  const settings = { count: 8, newDays: 0 };
  const seen = [];
  for (let d = 0; d < 3; d++) seen.push(...featuredForDate(all, settings, addDays('2026-11-24', d)).ids);
  assert.equal(new Set(seen).size, 24, 'three days of 8 cover all 24 businesses');
});

test('same date gives the same result (stable for every visitor)', () => {
  const a = featuredForDate(biz(20), {}, '2026-12-01');
  const b = featuredForDate(biz(20), {}, '2026-12-01');
  assert.deepEqual(a, b);
});

test('changing the seed reshuffles the order', () => {
  const a = featuredForDate(biz(20), { seed: 'one', newDays: 0 }, '2026-12-01').ids;
  const b = featuredForDate(biz(20), { seed: 'two', newDays: 0 }, '2026-12-01').ids;
  assert.notDeepEqual(a, b);
});

test('pinned businesses are featured on their dates only', () => {
  const all = biz(30);
  const pins = [{ id: 'b29', from: '2026-11-24', to: '2026-11-25' }];
  for (const date of ['2026-11-24', '2026-11-25']) {
    const r = featuredForDate(all, { count: 6, pins, newDays: 0 }, date);
    assert.ok(r.ids.includes('b29'));
    assert.equal(r.reasons.b29, 'pinned');
  }
  const after = featuredForDate(all, { count: 6, pins, newDays: 0 }, '2026-11-26');
  assert.notEqual(after.reasons.b29, 'pinned');
});

test('new businesses get initial visibility, capped per day', () => {
  const all = [...biz(20), { id: 'fresh1', publishedAt: '2026-11-20' }, { id: 'fresh2', publishedAt: '2026-11-23' }, { id: 'fresh3', publishedAt: '2026-11-22' }];
  const r = featuredForDate(all, { count: 8, newDays: 14, newMax: 2 }, '2026-11-24');
  const fresh = r.ids.filter((id) => r.reasons[id] === 'new').sort();
  assert.deepEqual(fresh, ['fresh2', 'fresh3'], 'newest first, at most newMax');
  const later = featuredForDate(all, { count: 8, newDays: 14, newMax: 2 }, '2026-12-20');
  assert.equal(Object.values(later.reasons).filter((x) => x === 'new').length, 0, 'boost ends after newDays');
});

test('"always" businesses appear every day, on top of the count, in a moving spot', () => {
  const all = biz(30);
  const spots = new Set();
  for (let d = 0; d < 20; d++) {
    const r = featuredForDate(all, { count: 10, newDays: 0, always: ['b05'] }, addDays('2026-11-24', d));
    assert.equal(r.ids.length, 11, 'ten rotating plus the always business');
    assert.equal(r.reasons.b05, 'always');
    assert.equal(r.ids.filter((id) => id === 'b05').length, 1);
    spots.add(r.ids.indexOf('b05'));
  }
  assert.ok(spots.size > 3, 'its position changes from day to day');
  const plan = streetPlan(11);
  assert.equal(plan.filter((x) => x === null).length, 3, 'three open chalets remain');
});

test('the street never holds more than its 14 chalets', () => {
  const r = featuredForDate(biz(30), { count: 13, newDays: 0, always: ['b05', 'b07'] }, '2026-11-24');
  assert.equal(r.ids.length, 14, 'twelve rotating plus the two always businesses');
  assert.ok(r.ids.includes('b05') && r.ids.includes('b07'));
  assert.equal(streetPlan(r.ids.length).filter((x) => x === null).length, 0);
});

test('settings are clamped to sane values', () => {
  const s = normalizeSettings({ count: -5, newDays: -3, newMax: 99, pins: [{ id: 'x' }] });
  assert.equal(s.count, 1);
  assert.equal(s.newDays, 0);
  assert.ok(s.newMax <= s.count);
  assert.deepEqual(s.pins, []);
});

test('street plan spreads open stalls between businesses', () => {
  for (let k = 0; k <= 14; k++) {
    const plan = streetPlan(k);
    assert.equal(plan.length, 14);
    assert.equal(plan.filter((x) => x === null).length, 14 - k);
    assert.deepEqual(plan.filter((x) => x !== null), Array.from({ length: k }, (_, i) => i));
  }
  const plan = streetPlan(10);
  assert.ok(plan.indexOf(null) > 0 && plan.indexOf(null) < 13, 'an open stall sits mid-street, not only at the end');
});

test('dayNumber and addDays agree', () => {
  assert.equal(dayNumber(addDays('2026-02-27', 3)) - dayNumber('2026-02-27'), 3);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});
