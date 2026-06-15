import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Mood } from '@prisma/client';
import { moodFrom } from './mood.util';

test('high valence + high energy → euphoric', () => {
  assert.equal(moodFrom(0.8, 0.9), Mood.EUPHORIC);
});

test('high valence + low energy → chill', () => {
  assert.equal(moodFrom(0.7, 0.2), Mood.CHILL);
});

test('low valence + high energy → intense', () => {
  assert.equal(moodFrom(0.2, 0.8), Mood.INTENSE);
});

test('low valence + low energy → melancholic', () => {
  assert.equal(moodFrom(0.2, 0.2), Mood.MELANCHOLIC);
});

test('missing features → neutral', () => {
  assert.equal(moodFrom(null, 0.5), Mood.NEUTRAL);
  assert.equal(moodFrom(0.5, null), Mood.NEUTRAL);
});
