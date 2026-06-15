export const IMPORT_QUEUE = 'import';

export const TRACK_URI_PREFIX = 'spotify:track:';

export const ImportJob = {
  EXTENDED_HISTORY: 'extended-history',
} as const;

/** A normalized play extracted from a Spotify "Extended Streaming History" file. */
export interface ExtendedEntry {
  ts: string; // ISO timestamp (dedup key)
  msPlayed: number;
  trackUri: string; // spotify:track:...
  skipped: boolean;
  // Metadata embedded in the export — lets us build the catalog WITHOUT calling
  // Spotify (its /tracks endpoints are 403/429 for dev-mode apps).
  trackName: string;
  artistName: string;
  albumName?: string;
}

export interface ExtendedImportJobData {
  userId: string;
  entries: ExtendedEntry[];
}
