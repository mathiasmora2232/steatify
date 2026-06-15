import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DnaArchetype {
  key: string;
  label: string;
  emoji: string;
  pct: number; // share of the headline mix
}

export interface MusicType {
  key: string;
  label: string;
  emoji: string;
  reason: string; // factual: which metric makes you this
  score: number; // 0-1 of the winning type
}

export interface MusicDna {
  hasData: boolean;
  type: MusicType | null; // dominant ADN Musical archetype (8-type system)
  ranked: MusicType[]; // all 8 archetypes, scored & sorted
  archetypes: DnaArchetype[]; // top 3, normalized to 100% (the headline mix)
  personality: string; // generated prose
  patterns: {
    nightPct: number; // % of plays after midnight (local)
    repeatMultiplier: number; // plays per track vs a 1.5 baseline
    avgTrackAgeYears: number | null; // how vintage your taste is
    playsPerActiveDay: number;
    newArtists30d: number;
    loyaltyPct: number; // % of plays to your top-5 artists
    artistChurnPct: number; // % of months your #1 artist changes
    tracksPerAlbum: number; // avg distinct tracks explored per album
  };
  totals: { plays: number; uniqueTracks: number; uniqueArtists: number; minutes: number };
}

interface RawScore {
  key: string;
  label: string;
  emoji: string;
  score: number; // 0-1
}

/**
 * Derives a "musical personality" from real listening signals — variety,
 * repetition, night-owl ratio, loyalty (top-artist concentration) and the
 * vintage of your taste. No genres/audio-features needed (Spotify no longer
 * exposes them), so it works with what we actually have.
 */
@Injectable()
export class DnaService {
  constructor(private readonly prisma: PrismaService) {}

  async compute(userId: string): Promise<MusicDna> {
    const tz =
      (await this.prisma.user.findUnique({ where: { id: userId }, select: { tzOffset: true } }))
        ?.tzOffset ?? 0;

    const [base, loyalty, age, activity, fresh, churn, album] = await Promise.all([
      this.base(userId, tz),
      this.loyalty(userId),
      this.avgAge(userId),
      this.activity(userId, tz),
      this.newArtists(userId),
      this.artistChurn(userId),
      this.albumDepth(userId),
    ]);

    if (base.plays === 0) {
      return {
        hasData: false,
        type: null,
        ranked: [],
        archetypes: [],
        personality: 'Aún no hay suficientes datos. Sincroniza o importa tu historial.',
        patterns: {
          nightPct: 0,
          repeatMultiplier: 0,
          avgTrackAgeYears: null,
          playsPerActiveDay: 0,
          newArtists30d: 0,
          loyaltyPct: 0,
          artistChurnPct: 0,
          tracksPerAlbum: 0,
        },
        totals: { plays: 0, uniqueTracks: 0, uniqueArtists: 0, minutes: 0 },
      };
    }

    const variety = base.uniqueArtists / base.plays; // 0..1 (high = explorer)
    const repeatPerTrack = base.plays / Math.max(base.uniqueTracks, 1);
    const nightRatio = base.night / base.plays;
    const playsPerDay = activity.days > 0 ? base.plays / activity.days : base.plays;

    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    const scores: RawScore[] = [
      { key: 'explorer', label: 'Explorador', emoji: '🧭', score: clamp(variety * 1.25) },
      { key: 'loyal', label: 'Fiel', emoji: '👑', score: clamp(loyalty.share) },
      { key: 'nocturnal', label: 'Nocturno', emoji: '🌙', score: clamp(nightRatio) },
      { key: 'obsessive', label: 'Obsesivo', emoji: '🔁', score: clamp((repeatPerTrack - 1) / 3) },
      { key: 'nostalgic', label: 'Nostálgico', emoji: '🕰️', score: clamp((age.years ?? 0) / 15) },
      { key: 'marathoner', label: 'Maratonista', emoji: '🎧', score: clamp(playsPerDay / 40) },
      { key: 'chaotic', label: 'Caótico', emoji: '🌀', score: clamp((churn.share - 0.2) / 0.55) },
      { key: 'collector', label: 'Coleccionista', emoji: '💿', score: clamp((album.tracksPerAlbum - 1) / 4) },
    ];

    const archetypes = this.toHeadline(scores);
    const facts = {
      uniqueArtists: base.uniqueArtists,
      loyaltyPct: Math.round(loyalty.share * 100),
      nightPct: Math.round(nightRatio * 100),
      repeatPerTrack: Number(repeatPerTrack.toFixed(1)),
      avgAge: age.years != null ? Math.round(age.years) : null,
      playsPerDay: Math.round(playsPerDay),
      churnPct: Math.round(churn.share * 100),
      tracksPerAlbum: Number(album.tracksPerAlbum.toFixed(1)),
    };
    const ranked: MusicType[] = [...scores]
      .sort((a, b) => b.score - a.score)
      .map((s) => ({ key: s.key, label: s.label, emoji: s.emoji, score: Number(s.score.toFixed(2)), reason: this.reasonFor(s.key, facts) }));

    return {
      hasData: true,
      type: ranked[0],
      ranked,
      archetypes,
      personality: this.personality(scores, {
        nightRatio,
        repeatPerTrack,
        loyalty: loyalty.share,
        variety,
      }),
      patterns: {
        nightPct: facts.nightPct,
        repeatMultiplier: Number((repeatPerTrack / 1.5).toFixed(1)),
        avgTrackAgeYears: facts.avgAge,
        playsPerActiveDay: facts.playsPerDay,
        newArtists30d: fresh,
        loyaltyPct: facts.loyaltyPct,
        artistChurnPct: facts.churnPct,
        tracksPerAlbum: facts.tracksPerAlbum,
      },
      totals: {
        plays: base.plays,
        uniqueTracks: base.uniqueTracks,
        uniqueArtists: base.uniqueArtists,
        minutes: Math.round(base.minutes),
      },
    };
  }

  private reasonFor(
    key: string,
    f: { uniqueArtists: number; loyaltyPct: number; nightPct: number; repeatPerTrack: number; avgAge: number | null; playsPerDay: number; churnPct: number; tracksPerAlbum: number },
  ): string {
    switch (key) {
      case 'explorer':
        return `${f.uniqueArtists} artistas distintos en tu historial — variedad muy alta.`;
      case 'loyal':
        return `${f.loyaltyPct}% de tus plays van a tus 5 artistas favoritos.`;
      case 'nocturnal':
        return `${f.nightPct}% de tu música suena de madrugada.`;
      case 'obsessive':
        return `Repites cada canción ${f.repeatPerTrack} veces de media.`;
      case 'nostalgic':
        return f.avgAge != null ? `Tu música promedia ${f.avgAge} años de antigüedad.` : 'Te inclinas por sonidos con historia.';
      case 'marathoner':
        return `${f.playsPerDay} reproducciones por día activo. Sesiones largas.`;
      case 'chaotic':
        return `Tu artista #1 cambia en el ${f.churnPct}% de los meses — saltas sin parar.`;
      case 'collector':
        return `Exploras ${f.tracksPerAlbum} canciones por álbum de media.`;
      default:
        return '';
    }
  }

  /** Top-3 archetypes by score, normalized so the mix sums to 100%. */
  private toHeadline(scores: RawScore[]): DnaArchetype[] {
    const top = [...scores].sort((a, b) => b.score - a.score).slice(0, 3);
    const sum = top.reduce((s, a) => s + a.score, 0) || 1;
    const pcts = top.map((a) => ({ ...a, pct: Math.round((a.score / sum) * 100) }));
    // Fix rounding drift so it sums to 100.
    const drift = 100 - pcts.reduce((s, a) => s + a.pct, 0);
    if (pcts[0]) pcts[0].pct += drift;
    return pcts.map(({ key, label, emoji, pct }) => ({ key, label, emoji, pct }));
  }

  private personality(
    scores: RawScore[],
    s: { nightRatio: number; repeatPerTrack: number; loyalty: number; variety: number },
  ): string {
    const top = [...scores].sort((a, b) => b.score - a.score)[0];
    const lines: Record<string, string> = {
      explorer: 'Vives buscando: saltas entre artistas y rara vez te quedas quieto.',
      loyal: 'No abandonas a tus artistas. Cuando conectas, te quedas y haces cientos de streams.',
      nocturnal: 'La noche es tuya. Tu mejor música pasa cuando el resto duerme.',
      obsessive: 'Cuando una canción te atrapa, la quemas sin piedad hasta el fondo.',
      nostalgic: 'Tu oído mira al pasado: prefieres lo que ya probó el tiempo.',
      marathoner: 'Sesiones largas, inmersión total. Pones play y desapareces.',
    };
    const main = lines[top?.key] ?? '';
    const detail =
      s.repeatPerTrack >= 3
        ? `Repites cada canción ${s.repeatPerTrack.toFixed(1)} veces de media.`
        : s.variety >= 0.6
          ? 'Descubres mucho y te aburres rápido de lo repetido.'
          : `Concentras ${Math.round(s.loyalty * 100)}% de tus escuchas en tus 5 artistas favoritos.`;
    return `${main} ${detail}`.trim();
  }

  // ── queries ──

  private async base(userId: string, tz: number) {
    const [row] = await this.prisma.$queryRaw<
      Array<{ plays: number; uniqueTracks: number; uniqueArtists: number; minutes: number; night: number }>
    >`
      SELECT COUNT(*)::int AS plays,
             COUNT(DISTINCT "trackId")::int AS "uniqueTracks",
             COUNT(DISTINCT "artistId")::int AS "uniqueArtists",
             (COALESCE(SUM("msPlayed"),0)/60000.0)::float AS minutes,
             (COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM "playedAt" + (${tz} || ' minutes')::interval) < 6))::float AS night
      FROM listening_history WHERE "userId" = ${userId}
    `;
    return row ?? { plays: 0, uniqueTracks: 0, uniqueArtists: 0, minutes: 0, night: 0 };
  }

  private async loyalty(userId: string): Promise<{ share: number }> {
    const [row] = await this.prisma.$queryRaw<Array<{ share: number }>>`
      WITH per AS (
        SELECT COUNT(*)::int AS c
        FROM listening_history WHERE "userId" = ${userId} AND "artistId" IS NOT NULL
        GROUP BY "artistId"
      ), ranked AS (
        SELECT c, ROW_NUMBER() OVER (ORDER BY c DESC) AS rn FROM per
      )
      SELECT COALESCE(SUM(c) FILTER (WHERE rn <= 5), 0)::float
             / NULLIF(SUM(c), 0)::float AS share
      FROM ranked
    `;
    return { share: row?.share ?? 0 };
  }

  private async avgAge(userId: string): Promise<{ years: number | null }> {
    const [row] = await this.prisma.$queryRaw<Array<{ years: number | null }>>`
      SELECT AVG(EXTRACT(YEAR FROM now())::int - substring(al."releaseDate" from 1 for 4)::int)::float AS years
      FROM listening_history lh
      JOIN tracks t ON t.id = lh."trackId"
      JOIN albums al ON al.id = t."albumId"
      WHERE lh."userId" = ${userId} AND al."releaseDate" ~ '^[0-9]{4}'
    `;
    return { years: row?.years ?? null };
  }

  private async activity(userId: string, tz: number): Promise<{ days: number }> {
    const [row] = await this.prisma.$queryRaw<Array<{ days: number }>>`
      SELECT COUNT(DISTINCT date_trunc('day', "playedAt" + (${tz} || ' minutes')::interval))::int AS days
      FROM listening_history WHERE "userId" = ${userId}
    `;
    return { days: row?.days ?? 0 };
  }

  /** How often your #1 artist changes month-to-month (0..1) — the "caótico" signal. */
  private async artistChurn(userId: string): Promise<{ share: number }> {
    const [row] = await this.prisma.$queryRaw<Array<{ share: number | null }>>`
      WITH tops AS (
        SELECT ym, name FROM (
          SELECT to_char(date_trunc('month', lh."playedAt"), 'YYYY-MM') AS ym, a.name,
                 ROW_NUMBER() OVER (PARTITION BY date_trunc('month', lh."playedAt") ORDER BY COUNT(*) DESC) AS rn
          FROM listening_history lh JOIN artists a ON a.id = lh."artistId"
          WHERE lh."userId" = ${userId} AND lh."artistId" IS NOT NULL
          GROUP BY 1, date_trunc('month', lh."playedAt"), a.name
        ) z WHERE rn = 1
      ),
      seq AS (SELECT name, LAG(name) OVER (ORDER BY ym) AS prev FROM tops)
      SELECT AVG(CASE WHEN prev IS NOT NULL AND name <> prev THEN 1 ELSE 0 END)::float AS share FROM seq
    `;
    return { share: row?.share ?? 0 };
  }

  /** Avg distinct tracks explored per album (>1.5 = you dig into albums) — "coleccionista". */
  private async albumDepth(userId: string): Promise<{ tracksPerAlbum: number }> {
    const [row] = await this.prisma.$queryRaw<Array<{ avg: number | null }>>`
      WITH per_album AS (
        SELECT COUNT(DISTINCT lh."trackId") AS dt
        FROM listening_history lh JOIN tracks t ON t.id = lh."trackId"
        WHERE lh."userId" = ${userId} AND t."albumId" IS NOT NULL
        GROUP BY t."albumId"
      )
      SELECT AVG(dt)::float AS avg FROM per_album
    `;
    return { tracksPerAlbum: row?.avg ?? 0 };
  }

  private async newArtists(userId: string): Promise<number> {
    const [row] = await this.prisma.$queryRaw<Array<{ c: number }>>`
      SELECT COUNT(*)::int AS c FROM (
        SELECT "artistId"
        FROM listening_history
        WHERE "userId" = ${userId} AND "artistId" IS NOT NULL
        GROUP BY "artistId"
        HAVING MIN("playedAt") >= now() - interval '30 days'
      ) x
    `;
    return row?.c ?? 0;
  }
}
