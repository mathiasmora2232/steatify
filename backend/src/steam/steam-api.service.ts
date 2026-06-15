import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, isAxiosError } from 'axios';
import type { Env } from '../config/env';
import type { SteamPlayer, SteamOwnedGame } from './steam.types';

const BASE = 'https://api.steampowered.com';

/**
 * Stateless client for the public Steam Web API. Uses one app-level key
 * (STEAM_API_KEY) — Steam identifies users by SteamID64, not per-user OAuth.
 */
@Injectable()
export class SteamApiService {
  private readonly logger = new Logger(SteamApiService.name);
  private readonly http: AxiosInstance;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.http = axios.create({ baseURL: BASE, timeout: 15_000 });
  }

  hasKey(): boolean {
    return Boolean(this.config.get('STEAM_API_KEY', { infer: true }));
  }

  private key(): string {
    const k = this.config.get('STEAM_API_KEY', { infer: true });
    if (!k) throw new ServiceUnavailableException('Steam no está configurado (falta STEAM_API_KEY).');
    return k;
  }

  /** Resolve a vanity/custom-URL name to a SteamID64, or null if not found. */
  async resolveVanity(vanity: string): Promise<string | null> {
    const { data } = await this.http.get<{ response: { success: number; steamid?: string } }>(
      '/ISteamUser/ResolveVanityURL/v1/',
      { params: { key: this.key(), vanityurl: vanity } },
    );
    return data.response.success === 1 ? (data.response.steamid ?? null) : null;
  }

  async getPlayer(steamId: string): Promise<SteamPlayer | null> {
    const { data } = await this.http.get<{ response: { players: SteamPlayer[] } }>(
      '/ISteamUser/GetPlayerSummaries/v2/',
      { params: { key: this.key(), steamids: steamId } },
    );
    return data.response.players?.[0] ?? null;
  }

  /** Owned games with playtime. Requires the profile's game details to be public. */
  async getOwnedGames(steamId: string): Promise<SteamOwnedGame[]> {
    const { data } = await this.http.get<{ response: { games?: SteamOwnedGame[] } }>(
      '/IPlayerService/GetOwnedGames/v1/',
      {
        params: {
          key: this.key(),
          steamid: steamId,
          include_appinfo: 1,
          include_played_free_games: 1,
        },
      },
    );
    return data.response.games ?? [];
  }

  /** Steam community level (the RPG-style profile level), or null if private/unknown. */
  async getSteamLevel(steamId: string): Promise<number | null> {
    try {
      const { data } = await this.http.get<{ response: { player_level?: number } }>(
        '/IPlayerService/GetSteamLevel/v1/',
        { params: { key: this.key(), steamid: steamId } },
      );
      return data.response?.player_level ?? null;
    } catch (e) {
      this.logger.warn(`steam level failed for ${steamId}: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }

  /** Construct the small icon URL from the game's img_icon_url hash. */
  iconUrl(appId: number, hash?: string): string | undefined {
    if (!hash) return undefined;
    return `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${hash}.jpg`;
  }

  /**
   * Store details for an app from the public Steam store API (no key): genres,
   * metacritic score (quality) and total recommendations (popularity). These
   * feed the catalog + the "pendingScore" that ranks unplayed games. Returns
   * empty/nulls for delisted/unknown apps or on rate-limit.
   */
  async getAppDetails(appId: number): Promise<{
    genres: string[];
    metacritic: number | null;
    recommendations: number | null;
    priceCents: number | null;
    isFree: boolean | null;
    rateLimited: boolean;
  }> {
    const empty = { genres: [], metacritic: null, recommendations: null, priceCents: null, isFree: null, rateLimited: false };
    try {
      const { data } = await axios.get<
        Record<
          string,
          {
            success: boolean;
            data?: {
              is_free?: boolean;
              genres?: { description: string }[];
              metacritic?: { score?: number };
              recommendations?: { total?: number };
              price_overview?: { final?: number };
            };
          }
        >
      >('https://store.steampowered.com/api/appdetails', {
        params: { appids: appId, filters: 'basic,genres,metacritic,recommendations,price_overview', l: 'english' },
        timeout: 12_000,
      });
      const entry = data[String(appId)];
      if (!entry?.success || !entry.data) return empty;
      const d = entry.data;
      return {
        genres: (d.genres ?? []).map((g) => g.description).filter(Boolean),
        metacritic: d.metacritic?.score ?? null,
        recommendations: d.recommendations?.total ?? null,
        priceCents: d.is_free ? 0 : (d.price_overview?.final ?? null),
        isFree: d.is_free ?? null,
        rateLimited: false,
      };
    } catch (e) {
      // 429 = hit the store rate limit; signal the caller to stop and retry later
      // (instead of marking the game "enriched" with no data and never retrying).
      if (isAxiosError(e) && e.response?.status === 429) return { ...empty, rateLimited: true };
      this.logger.warn(`store details failed for ${appId}: ${e instanceof Error ? e.message : e}`);
      return empty;
    }
  }
}
