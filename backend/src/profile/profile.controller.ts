import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WrappedService } from '../wrapped/wrapped.service';
import { DnaService } from '../dna/dna.service';
import { ChartsService } from '../charts/charts.service';

/**
 * Public, shareable profile at /profiles/:username (no auth). Honours the
 * isPublic flag. Combines the Wrapped recap + DNA archetypes into one identity.
 */
@Controller('profiles')
export class ProfileController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wrapped: WrappedService,
    private readonly dna: DnaService,
    private readonly charts: ChartsService,
  ) {}

  @Get(':username')
  async profile(@Param('username') username: string) {
    const u = await this.prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        location: true,
        website: true,
        isPublic: true,
        showMusic: true,
        showSteam: true,
        createdAt: true,
      },
    });
    if (!u) throw new NotFoundException('Perfil no encontrado.');

    const base = {
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      bannerUrl: u.bannerUrl,
      bio: u.bio,
      location: u.location,
      website: u.website,
      isPublic: u.isPublic,
      createdAt: u.createdAt,
    };
    if (!u.isPublic) return { ...base, private: true };

    const [wrapped, dna, charts, extras] = await Promise.all([
      this.wrapped.generate(u.id, 'month', { narrative: false }), // public profile doesn't show it — skip the GPT call
      this.dna.compute(u.id),
      this.charts.records(u.id),
      this.profileExtras(u.id),
    ]);
    // Respect the user's privacy toggles — hide music or gaming if turned off.
    return {
      ...base,
      personalityName: wrapped.personalityName,
      personality: wrapped.personality, // archetype { key,label,emoji,tagline } → passport class
      mix: wrapped.mix, // the blend for the passport bars
      music: u.showMusic ? wrapped.music : null,
      gaming: u.showSteam ? wrapped.gaming : null,
      dna: u.showMusic ? { archetypes: dna.archetypes, personality: dna.personality } : null,
      hallOfFame: u.showMusic ? charts.hallOfFame.slice(0, 4) : [],
      records: u.showMusic ? charts.records : [],
      collections: extras.collections,
      timeline: u.showMusic ? extras.timeline : [],
      exploration: u.showSteam ? extras.exploration : null,
    };
  }

  /** Collections counts, a life timeline (eras) and gaming exploration %. */
  private async profileExtras(userId: string) {
    const [obs, leyendas, cementerio, expl, eras] = await Promise.all([
      this.prisma.$queryRaw<Array<{ c: number }>>`
        SELECT COUNT(*)::int AS c FROM (
          SELECT "trackId" FROM listening_history WHERE "userId" = ${userId}
          GROUP BY "trackId" HAVING COUNT(*) >= 15
        ) x`,
      this.prisma.$queryRaw<Array<{ c: number }>>`SELECT COUNT(*)::int AS c FROM user_achievements WHERE "userId" = ${userId}`,
      this.prisma.$queryRaw<Array<{ c: number }>>`
        SELECT COUNT(*)::int AS c FROM (
          SELECT "trackId" FROM listening_history WHERE "userId" = ${userId}
          GROUP BY "trackId" HAVING MAX("playedAt") < now() - interval '120 days'
        ) x`,
      this.prisma.$queryRaw<Array<{ played: number; total: number }>>`
        SELECT COUNT(*) FILTER (WHERE "playtimeForever" > 0)::float AS played, COUNT(*)::float AS total
        FROM user_games WHERE "userId" = ${userId}`,
      this.prisma.musicEra.findMany({
        where: { userId },
        orderBy: { startDate: 'desc' },
        take: 8,
        select: { startDate: true, title: true, eraType: true },
      }),
    ]);
    const games = await this.prisma.userGame.count({ where: { userId, playtimeForever: { gt: 0 } } });
    const e = expl[0];
    return {
      collections: {
        obsesiones: obs[0]?.c ?? 0,
        mundos: games,
        leyendas: leyendas[0]?.c ?? 0,
        cementerio: cementerio[0]?.c ?? 0,
      },
      exploration: e && e.total > 0 ? Math.round((e.played / e.total) * 100) : null,
      timeline: eras.map((er) => ({
        date: er.startDate.toISOString(),
        title: er.title,
        type: er.eraType,
      })),
    };
  }
}
