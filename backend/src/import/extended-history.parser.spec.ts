import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseExtendedHistory } from './extended-history.parser';

test('parses valid audio rows', () => {
  const json = JSON.stringify([
    {
      ts: '2024-01-15T08:23:45Z',
      ms_played: 210000,
      spotify_track_uri: 'spotify:track:abc123',
      skipped: false,
      master_metadata_track_name: 'Karma Police',
      master_metadata_album_artist_name: 'Radiohead',
      master_metadata_album_album_name: 'OK Computer',
    },
    {
      ts: '2024-01-15T08:27:10Z',
      ms_played: 5000,
      spotify_track_uri: 'spotify:track:def456',
      skipped: true,
    },
  ]);
  const out = parseExtendedHistory(json);
  assert.equal(out.length, 2);
  assert.deepEqual(out[0], {
    ts: '2024-01-15T08:23:45Z',
    msPlayed: 210000,
    trackUri: 'spotify:track:abc123',
    skipped: false,
    trackName: 'Karma Police',
    artistName: 'Radiohead',
    albumName: 'OK Computer',
  });
  assert.equal(out[1].skipped, true);
});

test('falls back to placeholders when track/artist names are missing', () => {
  const json = JSON.stringify([
    { ts: '2024-01-01T00:00:00Z', ms_played: 1000, spotify_track_uri: 'spotify:track:x' },
  ]);
  const out = parseExtendedHistory(json);
  assert.equal(out[0].trackName, 'Unknown Track');
  assert.equal(out[0].artistName, 'Unknown Artist');
  assert.equal(out[0].albumName, undefined);
});

test('drops podcast episodes (no track uri) and malformed rows', () => {
  const json = JSON.stringify([
    { ts: '2024-01-01T00:00:00Z', ms_played: 1000, spotify_episode_uri: 'spotify:episode:x' },
    { ts: '2024-01-01T00:00:00Z', ms_played: 1000, spotify_track_uri: 'spotify:track:keep' },
    { ts: '2024-01-01T00:00:00Z', spotify_track_uri: 'spotify:track:no-ms' }, // missing ms
    { ms_played: 1000, spotify_track_uri: 'spotify:track:no-ts' }, // missing ts
  ]);
  const out = parseExtendedHistory(json);
  assert.equal(out.length, 1);
  assert.equal(out[0].trackUri, 'spotify:track:keep');
});

test('returns [] for invalid JSON or non-array', () => {
  assert.deepEqual(parseExtendedHistory('not json'), []);
  assert.deepEqual(parseExtendedHistory('{"not":"an array"}'), []);
  assert.deepEqual(parseExtendedHistory('[]'), []);
});

test('coerces missing skipped to false', () => {
  const json = JSON.stringify([
    { ts: '2024-01-01T00:00:00Z', ms_played: 1000, spotify_track_uri: 'spotify:track:x' },
  ]);
  assert.equal(parseExtendedHistory(json)[0].skipped, false);
});
