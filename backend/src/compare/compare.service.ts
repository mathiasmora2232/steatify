import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WrappedService, type PersonalityMix } from '../wrapped/wrapped.service';

interface UserVibe {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  artists: Map<string, { name: string; img: string | null; plays: number }>;
  genres: Set<string>;
  games: Map<number, string>;
  mix: PersonalityMix[];
  topArtist: { name: string; img: string | null } | null;
  topGame: { name: string; appId: number } | null;
  hasGaming: boolean;
}

export interface CompareResult {
  a: VibeLite;
  b: VibeLite;
  compatibility: number; // 0-100
  breakdown: { music: number; gaming: number; behavior: number };
  shared: {
    artists: { name: string; img: string | null }[];
    games: { name: string; appId: number }[];
    genres: string[];
  };
  contrast: { a: string; b: string } | null;
}
interface VibeLite {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  topArchetype: PersonalityMix | null;
}

/**
 * "Compare Spaces" / Vibe Match — how alike are two digital identities? Combines
 * music taste (artists + genres), gaming overlap, and BEHAVIOUR (the archetype
 * blend), so two Bad-Bunny fans who listen very differently don't read as twins.
 */
@Injectable()
export class CompareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wrapped: WrappedService,
  ) {}

  async compare(usernameA: string, usernameB: string): Promise<CompareResult> {
    const [ua, ub] = await Promise.all([
      this.findPublicUser(usernameA),
      this.findPublicUser(usernameB),
    ]);
    if (!ua || !ub) throw new NotFoundException('Uno de los perfiles no existe o es privado.');

    const [a, b] = await Promise.all([this.vibe(ua), this.vibe(ub)]);

    const artistSim = jaccard([...a.artists.keys()], [...b.artists.keys()]);
    const genreSim = jaccard([...a.genres], [...b.genres]);
    // Only blend genres when BOTH sides actually have genre tags — otherwise the
    // sparse/missing genre data unfairly drags the music score down.
    const bothGenres = a.genres.size > 0 && b.genres.size > 0;
    const musicSim = a.artists.size && b.artists.size
      ? bothGenres ? 0.6 * artistSim + 0.4 * genreSim : artistSim
      : 0;
    const gamingSim = a.hasGaming && b.hasGaming ? jaccard([...a.games.keys()], [...b.games.keys()]) : null;
    const behaviorSim = cosineMix(a.mix, b.mix);

    // Re-weight gaming out when either side has no Steam.
    const compat =
      gamingSim != null
        ? musicSim * 0.4 + gamingSim * 0.3 + behaviorSim * 0.3
        : musicSim * 0.6 + behaviorSim * 0.4;

    const sharedArtistIds = [...a.artists.keys()].filter((id) => b.artists.has(id));
    const sharedArtists = sharedArtistIds
      .map((id) => a.artists.get(id)!)
      .sort((x, y) => y.plays - x.plays)
      .slice(0, 6)
      .map((x) => ({ name: x.name, img: x.img }));
    const sharedGameIds = [...a.games.keys()].filter((id) => b.games.has(id));
    const sharedGames = sharedGameIds.slice(0, 6).map((id) => ({ name: a.games.get(id)!, appId: id }));
    const sharedGenres = [...a.genres].filter((g) => b.genres.has(g)).slice(0, 6);

    return {
      a: lite(a),
      b: lite(b),
      compatibility: Math.round(compat * 100),
      breakdown: {
        music: Math.round(musicSim * 100),
        gaming: gamingSim != null ? Math.round(gamingSim * 100) : 0,
        behavior: Math.round(behaviorSim * 100),
      },
      shared: { artists: sharedArtists, games: sharedGames, genres: sharedGenres },
      contrast:
        a.mix[0] && b.mix[0] && a.mix[0].key !== b.mix[0].key
          ? { a: a.mix[0].label, b: b.mix[0].label }
          : null,
    };
  }

  private async findPublicUser(username: string) {
    const u = await this.prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      select: { id: true, username: true, displayName: true, avatarUrl: true, isPublic: true, showMusic: true },
    });
    if (!u || !u.isPublic) return null;
    return u;
  }

  private async vibe(u: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  }): Promise<UserVibe> {
    const [artistRows, genreRows, gameRows, wrapped] = await Promise.all([
      this.prisma.$queryRaw<Array<{ id: string; name: string; img: string | null; plays: number }>>`
        SELECT lh."artistId" AS id, a.name, a."imageUrl" AS img, COUNT(*)::int AS plays
        FROM listening_history lh JOIN artists a ON a.id = lh."artistId"
        WHERE lh."userId" = ${u.id} AND lh."artistId" IS NOT NULL
        GROUP BY 1, 2, 3 ORDER BY plays DESC LIMIT 60
      `,
      this.prisma.$queryRaw<Array<{ name: string }>>`
        SELECT g.name FROM listening_history lh
        JOIN artist_genres ag ON ag."artistId" = lh."artistId"
        JOIN genres g ON g.id = ag."genreId"
        WHERE lh."userId" = ${u.id} GROUP BY g.name ORDER BY COUNT(*) DESC LIMIT 18
      `,
      this.prisma.$queryRaw<Array<{ appid: number; name: string }>>`
        SELECT g."appId" AS appid, g.name FROM user_games ug JOIN steam_games g ON g.id = ug."gameId"
        WHERE ug."userId" = ${u.id} AND ug."playtimeForever" > 0
        ORDER BY ug."playtimeForever" DESC LIMIT 60
      `,
      this.wrapped.generate(u.id, 'all', { narrative: false }).catch(() => null),
    ]);

    const artists = new Map(artistRows.map((r) => [r.id, { name: r.name, img: r.img, plays: r.plays }]));
    const games = new Map(gameRows.map((r) => [r.appid, r.name]));
    return {
      ...u,
      artists,
      genres: new Set(genreRows.map((r) => r.name)),
      games,
      mix: wrapped?.mix ?? [],
      topArtist: artistRows[0] ? { name: artistRows[0].name, img: artistRows[0].img } : null,
      topGame: gameRows[0] ? { name: gameRows[0].name, appId: gameRows[0].appid } : null,
      hasGaming: games.size > 0,
    };
  }
}

function lite(v: UserVibe): VibeLite {
  return { username: v.username, displayName: v.displayName, avatarUrl: v.avatarUrl, topArchetype: v.mix[0] ?? null };
}

/** Jaccard index over two id sets — |A∩B| / |A∪B|. */
function jaccard<T>(a: T[], b: T[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const sb = new Set(b);
  const inter = a.filter((x) => sb.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

/** Cosine similarity of two personality blends keyed by archetype. */
function cosineMix(a: PersonalityMix[], b: PersonalityMix[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const va: Record<string, number> = {};
  const vb: Record<string, number> = {};
  a.forEach((m) => (va[m.key] = m.pct));
  b.forEach((m) => (vb[m.key] = m.pct));
  const keys = new Set([...Object.keys(va), ...Object.keys(vb)]);
  let dot = 0, na = 0, nb = 0;
  keys.forEach((k) => {
    const x = va[k] ?? 0, y = vb[k] ?? 0;
    dot += x * y; na += x * x; nb += y * y;
  });
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}
