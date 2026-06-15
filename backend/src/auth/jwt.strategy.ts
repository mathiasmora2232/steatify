import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import type { Env } from '../config/env';

export interface JwtPayload {
  sub: string; // userId
}

export interface AuthUser {
  id: string;
  spotifyId: string | null;
}

/** Reads the access token from the httpOnly cookie or Authorization header. */
function cookieOrBearerExtractor(req: Request): string | null {
  const fromCookie = (req.cookies as Record<string, string> | undefined)?.access_token;
  if (fromCookie) return fromCookie;
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {
    super({
      jwtFromRequest: cookieOrBearerExtractor,
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, spotifyId: true },
    });
    if (!user) throw new UnauthorizedException();
    // Mark the user active (sliding window) so the background sync only runs for
    // people actually using the app. Fire-and-forget — never blocks the request.
    void this.cache.markSeen(user.id);
    return user;
  }
}
