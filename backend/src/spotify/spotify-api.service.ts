import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, isAxiosError } from 'axios';
import type { Env } from '../config/env';
import type {
  SpotifyTokenResponse,
  SpotifyUserProfile,
  SpotifyRecentlyPlayedResponse,
  SpotifyArtistFull,
  SpotifyAudioFeatures,
  SpotifyTrack,
  SpotifyCurrentlyPlaying,
} from './spotify.types';

const ACCOUNTS_URL = 'https://accounts.spotify.com';
const API_URL = 'https://api.spotify.com/v1';

// Scopes we request. Keep minimal — only what ingestion + profile need.
export const SPOTIFY_SCOPES = [
  'user-read-email',
  'user-read-private',
  'user-read-recently-played',
  'user-top-read',
  'user-read-currently-playing', // "Now Playing" widget
];

/**
 * Stateless client for the Spotify Web API. Knows nothing about our DB.
 * Handles OAuth token exchange/refresh and authenticated GETs, with retry on
 * 429 (rate limit) honoring the Retry-After header.
 */
@Injectable()
export class SpotifyApiService {
  private readonly logger = new Logger(SpotifyApiService.name);
  private readonly http: AxiosInstance;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.http = axios.create({ baseURL: API_URL, timeout: 15_000 });
  }

  buildAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.get('SPOTIFY_CLIENT_ID', { infer: true }),
      scope: SPOTIFY_SCOPES.join(' '),
      redirect_uri: this.config.get('SPOTIFY_REDIRECT_URI', { infer: true }),
      state,
      // Force a fresh consent screen. Reusing a stale Spotify session is a known
      // source of an opaque `error=server_error` on the callback; re-consenting
      // clears it. Cheap, and the user just re-clicks "Aceptar".
      show_dialog: 'true',
    });
    return `${ACCOUNTS_URL}/authorize?${params.toString()}`;
  }

  /** Exchange an authorization code for tokens (login). */
  async exchangeCode(code: string): Promise<SpotifyTokenResponse> {
    return this.postToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.get('SPOTIFY_REDIRECT_URI', { infer: true }),
    });
  }

  /** Exchange a refresh token for a fresh access token. */
  async refreshAccessToken(refreshToken: string): Promise<SpotifyTokenResponse> {
    return this.postToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
  }

  private async postToken(body: Record<string, string>): Promise<SpotifyTokenResponse> {
    const id = this.config.get('SPOTIFY_CLIENT_ID', { infer: true });
    const secret = this.config.get('SPOTIFY_CLIENT_SECRET', { infer: true });
    const basic = Buffer.from(`${id}:${secret}`).toString('base64');
    try {
      const { data } = await axios.post<SpotifyTokenResponse>(
        `${ACCOUNTS_URL}/api/token`,
        new URLSearchParams(body).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basic}`,
          },
          timeout: 15_000,
        },
      );
      return data;
    } catch (err) {
      this.logger.error(`Spotify token request failed: ${this.describe(err)}`);
      throw new InternalServerErrorException('Spotify token exchange failed');
    }
  }

  async getCurrentUserProfile(accessToken: string): Promise<SpotifyUserProfile> {
    return this.get<SpotifyUserProfile>('/me', accessToken);
  }

  /**
   * Recently played tracks. `after` is a Unix-ms cursor; pass the timestamp of
   * the most recent play we already stored to fetch only newer items.
   * NOTE: Spotify caps this at the last 50 items / ~24h — hence frequent polling.
   */
  async getRecentlyPlayed(
    accessToken: string,
    after?: number,
  ): Promise<SpotifyRecentlyPlayedResponse> {
    const params: Record<string, string | number> = { limit: 50 };
    if (after) params.after = after;
    return this.get<SpotifyRecentlyPlayedResponse>('/me/player/recently-played', accessToken, params);
  }

  /**
   * What the user is playing right now. Returns null when nothing is playing
   * (Spotify replies 204 No Content) or for non-track items (ads/podcasts).
   */
  async getCurrentlyPlaying(accessToken: string): Promise<SpotifyCurrentlyPlaying | null> {
    try {
      const res = await this.http.get<SpotifyCurrentlyPlaying>('/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${accessToken}` },
        validateStatus: (s) => s === 200 || s === 204,
      });
      if (res.status === 204 || !res.data?.item) return null;
      return res.data;
    } catch (err) {
      if (isAxiosError(err) && (err.response?.status === 403 || err.response?.status === 404)) {
        return null;
      }
      throw err;
    }
  }

  // NOTE: Spotify's multi-get endpoints (/artists?ids=, /tracks?ids=,
  // /audio-features) return 403 for apps without extended quota, and
  // /audio-features is deprecated outright. We therefore fetch per-id via the
  // single-resource endpoints, which work in development mode.

  /**
   * Fetch full track objects — the batch /tracks?ids= endpoint is 403 for
   * dev-mode apps, so we hit /tracks/{id} per id but with bounded concurrency
   * (much faster than sequential, gentle on the rate limit).
   */
  async getTracks(accessToken: string, ids: string[]): Promise<SpotifyTrack[]> {
    const results = await this.mapLimit(ids, 10, (id) => this.getTrack(accessToken, id));
    return results.filter((t): t is SpotifyTrack => Boolean(t));
  }

  /** Run an async mapper over items with at most `limit` in flight at once. */
  private async mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let i = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    });
    await Promise.all(workers);
    return out;
  }

  async getTrack(accessToken: string, id: string): Promise<SpotifyTrack | null> {
    return this.getOrNull<SpotifyTrack>(`/tracks/${id}`, accessToken);
  }

  /** Fetch full artist objects one id at a time. */
  async getArtists(accessToken: string, ids: string[]): Promise<SpotifyArtistFull[]> {
    const out: SpotifyArtistFull[] = [];
    for (const id of ids) {
      const artist = await this.getArtist(accessToken, id);
      if (artist) out.push(artist);
    }
    return out;
  }

  async getArtist(accessToken: string, id: string): Promise<SpotifyArtistFull | null> {
    return this.getOrNull<SpotifyArtistFull>(`/artists/${id}`, accessToken);
  }

  /**
   * Audio features (valence/energy/…). DEPRECATED by Spotify (2024) — returns 403
   * for new apps. We swallow the 403 and return [], so mood degrades to NEUTRAL
   * rather than crashing the sync. Kept for older apps that still have access.
   */
  async getAudioFeatures(accessToken: string, ids: string[]): Promise<SpotifyAudioFeatures[]> {
    if (ids.length === 0) return [];
    try {
      const data = await this.get<{ audio_features: (SpotifyAudioFeatures | null)[] }>(
        '/audio-features',
        accessToken,
        { ids: ids.slice(0, 100).join(',') },
      );
      return data.audio_features.filter((f): f is SpotifyAudioFeatures => Boolean(f));
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 403) {
        this.logger.warn('audio-features unavailable (403 / deprecated) — moods will be NEUTRAL');
        return [];
      }
      throw err;
    }
  }

  /** GET that treats 403/404 as "not available" (null) instead of throwing. */
  private async getOrNull<T>(path: string, accessToken: string): Promise<T | null> {
    try {
      return await this.get<T>(path, accessToken);
    } catch (err) {
      if (isAxiosError(err) && (err.response?.status === 403 || err.response?.status === 404)) {
        return null;
      }
      throw err;
    }
  }

  private async get<T>(
    path: string,
    accessToken: string,
    params?: Record<string, string | number>,
    attempt = 0,
  ): Promise<T> {
    try {
      const { data } = await this.http.get<T>(path, {
        params,
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return data;
    } catch (err) {
      // Honor rate limiting with a single bounded retry.
      if (isAxiosError(err) && err.response?.status === 429 && attempt < 3) {
        const retryAfter = Number(err.response.headers['retry-after'] ?? 1);
        this.logger.warn(`Rate limited on ${path}, retrying after ${retryAfter}s`);
        await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1000));
        return this.get<T>(path, accessToken, params, attempt + 1);
      }
      throw err;
    }
  }

  private describe(err: unknown): string {
    if (isAxiosError(err)) {
      return `${err.response?.status} ${JSON.stringify(err.response?.data ?? err.message)}`;
    }
    return err instanceof Error ? err.message : String(err);
  }
}
