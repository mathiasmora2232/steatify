import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SearchResults {
  query: string;
  artists: { artistId: string; name: string; plays: number; imageUrl: string | null }[];
  tracks: { trackId: string; name: string; artist: string | null; plays: number; imageUrl: string | null }[];
  albums: { albumId: string; name: string; plays: number; imageUrl: string | null }[];
  games: { appId: number; name: string; hours: number; headerUrl: string }[];
}

/**
 * Global Steatify search — scoped to what the user actually has (played tracks/
 * artists/albums + owned Steam games), ranked by relevance (plays / hours). The
 * premium "search everything" bar that ties artist/song/game detail pages.
 */
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(userId: string, q: string): Promise<SearchResults> {
    const query = q.trim();
    if (query.length < 2) return { query, artists: [], tracks: [], albums: [], games: [] };
    const like = `%${query}%`;

    const [artists, tracks, albums, games] = await Promise.all([
      this.prisma.$queryRaw<Array<{ artistId: string; name: string; plays: number; image: string | null }>>`
        SELECT lh."artistId", a.name, COUNT(*)::int AS plays, a."imageUrl" AS image
        FROM listening_history lh JOIN artists a ON a.id = lh."artistId"
        WHERE lh."userId" = ${userId} AND a.name ILIKE ${like}
        GROUP BY lh."artistId", a.name, a."imageUrl" ORDER BY plays DESC LIMIT 6
      `,
      this.prisma.$queryRaw<Array<{ trackId: string; name: string; artist: string | null; plays: number; image: string | null }>>`
        SELECT lh."trackId", t.name, a.name AS artist, COUNT(*)::int AS plays, al."imageUrl" AS image
        FROM listening_history lh JOIN tracks t ON t.id = lh."trackId"
        LEFT JOIN track_artists ta ON ta."trackId" = t.id AND ta.position = 0
        LEFT JOIN artists a ON a.id = ta."artistId"
        LEFT JOIN albums al ON al.id = t."albumId"
        WHERE lh."userId" = ${userId} AND t.name ILIKE ${like}
        GROUP BY lh."trackId", t.name, a.name, al."imageUrl" ORDER BY plays DESC LIMIT 6
      `,
      this.prisma.$queryRaw<Array<{ albumId: string; name: string; plays: number; image: string | null }>>`
        SELECT al.id AS "albumId", al.name, COUNT(*)::int AS plays, al."imageUrl" AS image
        FROM listening_history lh JOIN tracks t ON t.id = lh."trackId" JOIN albums al ON al.id = t."albumId"
        WHERE lh."userId" = ${userId} AND al.name ILIKE ${like}
        GROUP BY al.id, al.name, al."imageUrl" ORDER BY plays DESC LIMIT 5
      `,
      this.prisma.$queryRaw<Array<{ appId: number; name: string; hours: number }>>`
        SELECT g."appId", g.name, ROUND(ug."playtimeForever" / 60.0, 1)::float AS hours
        FROM user_games ug JOIN steam_games g ON g.id = ug."gameId"
        WHERE ug."userId" = ${userId} AND g.name ILIKE ${like}
        ORDER BY ug."playtimeForever" DESC LIMIT 6
      `,
    ]);

    return {
      query,
      artists: artists.map((a) => ({ artistId: a.artistId, name: a.name, plays: a.plays, imageUrl: a.image })),
      tracks: tracks.map((t) => ({ trackId: t.trackId, name: t.name, artist: t.artist, plays: t.plays, imageUrl: t.image })),
      albums: albums.map((al) => ({ albumId: al.albumId, name: al.name, plays: al.plays, imageUrl: al.image })),
      games: games.map((g) => ({ appId: g.appId, name: g.name, hours: g.hours, headerUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appId}/header.jpg` })),
    };
  }
}
