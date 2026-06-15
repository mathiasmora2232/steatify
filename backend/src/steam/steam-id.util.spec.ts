import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSteamIdInput } from './steam-id.util';

test('bare SteamID64 is used directly', () => {
  assert.deepEqual(parseSteamIdInput('76561197960435530'), {
    kind: 'id',
    steamId: '76561197960435530',
  });
});

test('extracts id from a /profiles/ URL', () => {
  assert.deepEqual(parseSteamIdInput('https://steamcommunity.com/profiles/76561197960435530/'), {
    kind: 'id',
    steamId: '76561197960435530',
  });
});

test('extracts vanity from an /id/ URL', () => {
  assert.deepEqual(parseSteamIdInput('https://steamcommunity.com/id/robinwalker/'), {
    kind: 'vanity',
    vanity: 'robinwalker',
  });
});

test('bare vanity name (with optional @) → vanity', () => {
  assert.deepEqual(parseSteamIdInput('  @robinwalker '), { kind: 'vanity', vanity: 'robinwalker' });
  assert.deepEqual(parseSteamIdInput('coolgamer'), { kind: 'vanity', vanity: 'coolgamer' });
});

test('non-17-digit numbers are treated as vanity, not id', () => {
  assert.deepEqual(parseSteamIdInput('12345'), { kind: 'vanity', vanity: '12345' });
});
