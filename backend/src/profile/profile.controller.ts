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

    const [wrapped, dna, charts] = await Promise.all([
      this.wrapped.generate(u.id, 'month', { narrative: false }), // public profile doesn't show it — skip the GPT call
      this.dna.compute(u.id),
      this.charts.records(u.id),
    ]);
    // Respect the user's privacy toggles — hide music or gaming if turned off.
    return {
      ...base,
      personalityName: wrapped.personalityName,
      music: u.showMusic ? wrapped.music : null,
      gaming: u.showSteam ? wrapped.gaming : null,
      dna: u.showMusic ? { archetypes: dna.archetypes, personality: dna.personality } : null,
      hallOfFame: u.showMusic ? charts.hallOfFame.slice(0, 4) : [],
      records: u.showMusic ? charts.records : [],
    };
  }
}
