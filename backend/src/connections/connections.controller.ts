import { Controller, Delete, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

/** External connections (Spotify, Steam) for the current Sonora account. */
@UseGuards(JwtAuthGuard)
@Controller('connections')
export class ConnectionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const [spotify, steam] = await Promise.all([
      this.prisma.spotifyAccount.findUnique({ where: { userId: user.id }, select: { scope: true } }),
      this.prisma.steamAccount.findUnique({
        where: { userId: user.id },
        select: { steamId: true, personaName: true, avatarUrl: true },
      }),
    ]);
    const u = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { displayName: true, country: true, spotifyId: true },
    });
    return {
      spotify: {
        connected: Boolean(spotify) && u?.spotifyId !== 'guest',
        displayName: u?.displayName ?? null,
        country: u?.country ?? null,
      },
      steam: {
        connected: Boolean(steam),
        steamId: steam?.steamId ?? null,
        personaName: steam?.personaName ?? null,
        avatarUrl: steam?.avatarUrl ?? null,
      },
    };
  }

  @Delete('spotify')
  async disconnectSpotify(@CurrentUser() user: AuthUser) {
    await this.prisma.spotifyAccount.deleteMany({ where: { userId: user.id } });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { spotifyId: null, syncEnabled: false, country: null, product: null },
    });
    return { ok: true };
  }

  @Delete('steam')
  async disconnectSteam(@CurrentUser() user: AuthUser) {
    // UserGame rows cascade off the account? No — delete explicitly.
    await this.prisma.userGame.deleteMany({ where: { userId: user.id } });
    await this.prisma.steamAccount.deleteMany({ where: { userId: user.id } });
    return { ok: true };
  }
}
