import { ExtendedEntry, TRACK_URI_PREFIX } from './import.constants';

/**
 * Pure parser for one Spotify "Extended Streaming History" JSON file's text.
 * Keeps only audio-track rows (those with a `spotify_track_uri`); podcast
 * episodes and malformed rows are dropped. Extracted from ImportService so it
 * can be unit-tested without Nest/DI.
 */
export function parseExtendedHistory(jsonText: string): ExtendedEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: ExtendedEntry[] = [];
  for (const row of parsed as Array<Record<string, unknown>>) {
    const uri = row.spotify_track_uri;
    const ms = row.ms_played;
    const ts = row.ts;
    if (typeof uri !== 'string' || !uri.startsWith(TRACK_URI_PREFIX)) continue;
    if (typeof ms !== 'number' || typeof ts !== 'string') continue;
    const trackName = row.master_metadata_track_name;
    const artistName = row.master_metadata_album_artist_name;
    const albumName = row.master_metadata_album_album_name;
    out.push({
      ts,
      msPlayed: ms,
      trackUri: uri,
      skipped: Boolean(row.skipped),
      trackName: typeof trackName === 'string' && trackName ? trackName : 'Unknown Track',
      artistName: typeof artistName === 'string' && artistName ? artistName : 'Unknown Artist',
      albumName: typeof albumName === 'string' && albumName ? albumName : undefined,
    });
  }
  return out;
}
