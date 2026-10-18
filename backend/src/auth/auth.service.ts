import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SpotifyApiService } from '../spotify/spotify-api.service';
import { SpotifyTokensService } from '../spotify/spotify-tokens.service';
import { sha256 } from '../common/crypto.util';
import { hashPassword, verifyPassword } from '../common/password.util';
import type { Env } from '../config/env';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly spotifyApi: SpotifyApiService,
    private readonly spotifyTokens: SpotifyTokensService,
  ) {}

  // ── Steatify account auth (email/username + password) ──

  async register(
    input: { email: string; username: string; password: string; displayName?: string },
    meta: SessionMeta,
  ): Promise<AuthTokens> {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      throw new ConflictException('El usuario debe tener 3-20 caracteres (a-z, 0-9, _).');
    }
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { email: true, username: true },
    });
    if (existing) {
      throw new ConflictException(
        existing.email === email ? 'Ese email ya está registrado.' : 'Ese usuario ya existe.',
      );
    }
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        passwordHash: hashPassword(input.password),
        displayName: input.displayName?.trim() || username,
        syncEnabled: false,
      },
    });
    this.logger.log(`Registered account ${username} (${user.id})`);
    return this.issueSession(user.id, meta);
  }

  async login(identifier: string, password: string, meta: SessionMeta): Promise<AuthTokens> {
    const id = identifier.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: id }, { username: id }] },
      select: { id: true, passwordHash: true },
    });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }
    return this.issueSession(user.id, meta);
  }

  /** Step 1: where to send the browser to start Spotify OAuth. */
  buildLoginUrl(state: string): string {
    return this.spotifyApi.buildAuthorizeUrl(state);
  }

  /**
   * Step 2: handle the OAuth callback. Exchange the code, sync the profile,
   * store Spotify tokens, and mint our own session tokens.
   */
  /**
   * Handle the OAuth callback. If `currentUserId` is set (the user is already
   * logged into a Steatify account), Spotify is CONNECTED to that account.
   * Otherwise we fall back to sign-in/sign-up by Spotify identity (legacy).
   */
  async handleSpotifyCallback(
    code: string,
    meta: SessionMeta,
    currentUserId?: string,
  ): Promise<AuthTokens> {
    const tokens = await this.spotifyApi.exchangeCode(code);
    const profile = await this.spotifyApi.getCurrentUserProfile(tokens.access_token);

    let userId: string;
    if (currentUserId) {
      // Connect Spotify to the existing Steatify account.
      const existing = await this.prisma.user.findUnique({
        where: { spotifyId: profile.id },
        select: { id: true },
      });
      if (existing && existing.id !== currentUserId) {
        throw new ConflictException('Esta cuenta de Spotify ya está conectada a otro usuario.');
      }
      const me = await this.prisma.user.findUnique({ where: { id: currentUserId } });
      await this.prisma.user.update({
        where: { id: currentUserId },
        data: {
          spotifyId: profile.id,
          country: profile.country,
          product: profile.product,
          displayName: me?.displayName ?? profile.display_name,
          avatarUrl: me?.avatarUrl ?? profile.images?.[0]?.url,
          syncEnabled: true,
        },
      });
      userId = currentUserId;
    } else {
      const user = await this.prisma.user.upsert({
        where: { spotifyId: profile.id },
        create: {
          spotifyId: profile.id,
          displayName: profile.display_name,
          email: profile.email,
          country: profile.country,
          product: profile.product,
          avatarUrl: profile.images?.[0]?.url,
          syncEnabled: true,
        },
        update: {
          country: profile.country,
          product: profile.product,
        },
      });
      userId = user.id;
    }

    await this.spotifyTokens.upsertFromLogin(userId, tokens);
    this.logger.log(`Spotify connected for user ${userId} (${profile.id})`);
    return this.issueSession(userId, meta);
  }

  /** Verify an access token and return its userId (for connect-while-logged-in). */
  async userIdFromAccessToken(token: string | undefined): Promise<string | undefined> {
    if (!token) return undefined;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      return payload.sub;
    } catch {
      return undefined;
    }
  }

  /**
   * Guest session — enter without Spotify OAuth. Useful for demos and for
   * Steam-only usage (Steam links by ID, no OAuth). A single shared guest user
   * keeps it simple; it has no Spotify account so music sync stays off.
   */
  async guestSession(meta: SessionMeta): Promise<AuthTokens> {
    const user = await this.prisma.user.upsert({
      where: { spotifyId: 'guest' },
      create: { spotifyId: 'guest', displayName: 'Invitado', syncEnabled: false },
      update: {},
    });
    return this.issueSession(user.id, meta);
  }

  /** Mint an access JWT + a rotating opaque refresh token (stored hashed). */
  async issueSession(userId: string, meta: SessionMeta): Promise<AuthTokens> {
    // Prune this user's dead sessions (revoked or expired) so they don't pile up
    // — every fresh login used to leave a new row behind forever.
    await this.prisma.session.deleteMany({
      where: { userId, OR: [{ revokedAt: { not: null } }, { expiresAt: { lt: new Date() } }] },
    });

    const accessToken = await this.jwt.signAsync(
      { sub: userId },
      { expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }) },
    );

    const refreshToken = randomBytes(48).toString('base64url');
    const refreshTtl = this.config.get('JWT_REFRESH_TTL', { infer: true });
    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: sha256(refreshToken),
        userAgent: meta.userAgent,
        ip: meta.ip,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Refresh WITHOUT rotating the refresh token. Rotation caused a race: when
   * several requests hit a just-expired access token at once, the first rotated
   * (revoked) the token and the rest failed → spurious logout → re-login →
   * hundreds of dangling sessions. Now we keep the same refresh token, just
   * slide its 30-day window forward and mint a fresh access token. Idempotent,
   * so parallel refreshes all succeed.
   */
  async refresh(refreshToken: string, meta: SessionMeta): Promise<AuthTokens> {
    const hash = sha256(refreshToken);
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const refreshTtl = this.config.get('JWT_REFRESH_TTL', { infer: true });
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
        userAgent: meta.userAgent ?? session.userAgent,
        ip: meta.ip ?? session.ip,
      },
    });

    const accessToken = await this.jwt.signAsync(
      { sub: session.userId },
      { expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }) },
    );
    return { accessToken, refreshToken };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Active sessions for a user, flagging which one is the current device. */
  async listSessions(userId: string, currentRefreshToken?: string) {
    const currentHash = currentRefreshToken ? sha256(currentRefreshToken) : null;
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, userAgent: true, ip: true, createdAt: true, refreshTokenHash: true },
    });
    return sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ip: s.ip,
      createdAt: s.createdAt,
      current: currentHash != null && s.refreshTokenHash === currentHash,
    }));
  }

  /** Revoke one session (must belong to the user). */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Revoke every session except the current device ("log out everywhere else"). */
  async revokeOtherSessions(userId: string, currentRefreshToken?: string): Promise<void> {
    const currentHash = currentRefreshToken ? sha256(currentRefreshToken) : '';
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null, refreshTokenHash: { not: currentHash } },
      data: { revokedAt: new Date() },
    });
  }
}
