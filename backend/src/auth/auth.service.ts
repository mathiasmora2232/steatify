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

  // ── Sonora account auth (email/username + password) ──

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
   * logged into a Sonora account), Spotify is CONNECTED to that account.
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
      // Connect Spotify to the existing Sonora account.
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

  /** Rotate a refresh token: validate, revoke old, issue a fresh pair. */
  async refresh(refreshToken: string, meta: SessionMeta): Promise<AuthTokens> {
    const hash = sha256(refreshToken);
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return this.issueSession(session.userId, meta);
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
