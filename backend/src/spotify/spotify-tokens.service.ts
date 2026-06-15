import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SpotifyApiService } from './spotify-api.service';
import { encryptSecret, decryptSecret } from '../common/crypto.util';
import type { SpotifyTokenResponse } from './spotify.types';

// Refresh a bit before actual expiry to avoid races near the boundary.
const EXPIRY_SKEW_MS = 60_000;

/**
 * Owns the lifecycle of a user's Spotify tokens: persisting them encrypted,
 * and handing out a guaranteed-valid access token (transparently refreshing).
 */
@Injectable()
export class SpotifyTokensService {
  private readonly logger = new Logger(SpotifyTokensService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: SpotifyApiService,
  ) {}

  /** Persist tokens from an initial code exchange (login). */
  async upsertFromLogin(userId: string, tokens: SpotifyTokenResponse): Promise<void> {
    if (!tokens.refresh_token) {
      throw new UnauthorizedException('Spotify did not return a refresh token');
    }
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    const data = {
      accessTokenEnc: encryptSecret(tokens.access_token),
      refreshTokenEnc: encryptSecret(tokens.refresh_token),
      scope: tokens.scope,
      tokenType: tokens.token_type,
      expiresAt,
    };
    await this.prisma.spotifyAccount.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  /**
   * Return a valid access token for the user, refreshing if it's expired or
   * about to. Refresh tokens may rotate — persist the new one when present.
   */
  async getValidAccessToken(userId: string): Promise<string> {
    const account = await this.prisma.spotifyAccount.findUnique({ where: { userId } });
    if (!account) throw new UnauthorizedException('No linked Spotify account');

    if (account.expiresAt.getTime() - EXPIRY_SKEW_MS > Date.now()) {
      return decryptSecret(account.accessTokenEnc);
    }

    const refreshToken = decryptSecret(account.refreshTokenEnc);
    const refreshed = await this.api.refreshAccessToken(refreshToken);
    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

    await this.prisma.spotifyAccount.update({
      where: { userId },
      data: {
        accessTokenEnc: encryptSecret(refreshed.access_token),
        refreshTokenEnc: refreshed.refresh_token
          ? encryptSecret(refreshed.refresh_token)
          : account.refreshTokenEnc,
        scope: refreshed.scope || account.scope,
        expiresAt,
      },
    });
    this.logger.debug(`Refreshed Spotify access token for user ${userId}`);
    return refreshed.access_token;
  }
}
