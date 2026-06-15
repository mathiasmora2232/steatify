import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import type { Request, Response, CookieOptions } from 'express';
import { AuthService, AuthTokens } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { AuthUser } from './jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import type { Env } from '../config/env';

const STATE_COOKIE = 'spotify_oauth_state';

class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}

class LoginDto {
  @IsString()
  identifier!: string; // email or username

  @IsString()
  password!: string;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {}

  // ── Sonora account ──
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.register(dto, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    this.setAuthCookies(res, tokens);
    return { ok: true };
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.login(dto.identifier, dto.password, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    this.setAuthCookies(res, tokens);
    return { ok: true };
  }

  // Step 1 — kick off Spotify OAuth.
  @Get('spotify/login')
  spotifyLogin(@Res() res: Response) {
    const state = randomBytes(16).toString('hex');
    res.cookie(STATE_COOKIE, state, this.cookieOpts(600)); // 10 min
    res.redirect(this.auth.buildLoginUrl(state));
  }

  // Step 2 — Spotify redirects back here with ?code&state.
  @Get('spotify/callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const frontend = this.config.get('FRONTEND_URL', { infer: true });
    if (error) return res.redirect(`${frontend}/login?error=${encodeURIComponent(error)}`);
    if (!code) throw new BadRequestException('Missing authorization code');

    const expected = (req.cookies as Record<string, string>)?.[STATE_COOKIE];
    if (!state || !expected || state !== expected) {
      throw new UnauthorizedException('Invalid OAuth state'); // CSRF protection
    }
    res.clearCookie(STATE_COOKIE);

    // If they're already logged into a Sonora account, connect Spotify to it.
    const currentUserId = await this.auth.userIdFromAccessToken(
      (req.cookies as Record<string, string>)?.access_token,
    );

    try {
      const tokens = await this.auth.handleSpotifyCallback(
        code,
        { userAgent: req.headers['user-agent'], ip: req.ip },
        currentUserId,
      );
      this.setAuthCookies(res, tokens);
      res.redirect(`${frontend}/dashboard`);
    } catch (err) {
      // Most commonly: Spotify app in Development Mode → user not on the allowlist
      // → 403 on /me. Don't 500; bounce back with a friendly explanation.
      const status =
        (err as { response?: { status?: number } })?.response?.status ?? 0;
      const reason =
        status === 403
          ? 'spotify_access'
          : (err as { status?: number })?.status === 409
            ? 'spotify_taken'
            : 'spotify_failed';
      this.logger.warn(`Spotify callback failed (${status || reason}): ${err instanceof Error ? err.message : err}`);
      res.redirect(`${frontend}/login?error=${reason}`);
    }
  }

  // Enter without Spotify (demo / Steam-only).
  @Post('guest')
  async guest(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.auth.guestSession({
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    this.setAuthCookies(res, tokens);
    return { ok: true, guest: true };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies as Record<string, string>)?.refresh_token;
    if (!token) throw new UnauthorizedException('Missing refresh token');
    const tokens = await this.auth.refresh(token, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    this.setAuthCookies(res, tokens);
    return { ok: true };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout((req.cookies as Record<string, string>)?.refresh_token);
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        spotifyId: true,
        displayName: true,
        avatarUrl: true,
        country: true,
        product: true,
        createdAt: true,
        lastSyncedAt: true,
      },
    });
  }

  // ── cookie helpers ──
  private cookieOpts(maxAgeSeconds: number): CookieOptions {
    const isProd = this.config.get('NODE_ENV', { infer: true }) === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: maxAgeSeconds * 1000,
    };
  }

  private setAuthCookies(res: Response, tokens: AuthTokens) {
    res.cookie('access_token', tokens.accessToken, this.cookieOpts(this.config.get('JWT_ACCESS_TTL', { infer: true })));
    res.cookie('refresh_token', tokens.refreshToken, this.cookieOpts(this.config.get('JWT_REFRESH_TTL', { infer: true })));
  }
}
