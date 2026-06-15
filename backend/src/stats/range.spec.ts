import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rangeStart, resolveWindow } from './range';

const iso = (d: Date | null) => (d ? d.toISOString() : null);

test('rangeStart today is UTC midnight when tz=0', () => {
  const now = new Date('2026-06-12T15:00:00Z');
  assert.equal(iso(rangeStart('today', now, 0)), '2026-06-12T00:00:00.000Z');
});

test('rangeStart today for UTC-5 is local midnight (05:00 UTC)', () => {
  // 03:00 UTC = 22:00 local on the 11th → local "today" began at 11th 05:00 UTC.
  const now = new Date('2026-06-12T03:00:00Z');
  assert.equal(iso(rangeStart('today', now, -300)), '2026-06-11T05:00:00.000Z');
});

test('rangeStart 24h is a rolling window (tz-independent)', () => {
  const now = new Date('2026-06-12T15:00:00Z');
  assert.equal(iso(rangeStart('24h', now, -300)), '2026-06-11T15:00:00.000Z');
});

test('rangeStart all is open (null)', () => {
  assert.equal(rangeStart('all', new Date(), -300), null);
});

test('resolveWindow day uses local day bounds for UTC-5', () => {
  const w = resolveWindow({ day: '2026-06-12' }, -300);
  assert.equal(iso(w.start), '2026-06-12T05:00:00.000Z');
  assert.equal(iso(w.end), '2026-06-13T05:00:00.000Z');
});

test('resolveWindow range is inclusive of the "to" day', () => {
  const w = resolveWindow({ from: '2026-06-11', to: '2026-06-12' }, -300);
  assert.equal(iso(w.start), '2026-06-11T05:00:00.000Z');
  assert.equal(iso(w.end), '2026-06-13T05:00:00.000Z'); // through end of the 12th local
});

test('resolveWindow falls back to a preset, ignoring junk', () => {
  const w = resolveWindow({ range: 'not-a-range' }, 0);
  assert.equal(w.label, 'Último mes'); // defaults to 30d
  assert.equal(w.end, null);
});

test('resolveWindow prioritizes day over from/to over range', () => {
  const w = resolveWindow({ day: '2026-01-01', from: '2026-02-01', to: '2026-02-02', range: '7d' }, 0);
  assert.equal(iso(w.start), '2026-01-01T00:00:00.000Z');
});
