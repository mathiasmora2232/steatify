/** Minimal typings for the slices of the Spotify Web API we consume. */

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number; // seconds
  refresh_token?: string; // not always returned on refresh
}

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyUserProfile {
  id: string;
  display_name: string | null;
  email?: string;
  country?: string;
  product?: string;
  images: SpotifyImage[];
}

export interface SpotifyArtistRef {
  id: string;
  name: string;
}

export interface SpotifyArtistFull extends SpotifyArtistRef {
  genres: string[];
  popularity: number;
  followers: { total: number };
  images: SpotifyImage[];
}

export interface SpotifyAlbumRef {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  total_tracks: number;
  images: SpotifyImage[];
  artists: SpotifyArtistRef[];
}

export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  explicit: boolean;
  popularity?: number;
  preview_url: string | null;
  external_ids?: { isrc?: string };
  album: SpotifyAlbumRef;
  artists: SpotifyArtistRef[];
}

export interface SpotifyPlayHistoryItem {
  track: SpotifyTrack;
  played_at: string; // ISO-8601, the dedup key
  context: { type: string; uri: string } | null;
}

export interface SpotifyRecentlyPlayedResponse {
  items: SpotifyPlayHistoryItem[];
  next: string | null;
  cursors: { after: string; before: string } | null;
}

export interface SpotifyCurrentlyPlaying {
  is_playing: boolean;
  progress_ms: number | null;
  currently_playing_type: string; // track / episode / ad / unknown
  item: SpotifyTrack | null;
}

export interface SpotifyAudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  valence: number;
  tempo: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  liveness: number;
  loudness: number;
  key: number;
  mode: number;
  time_signature: number;
}
