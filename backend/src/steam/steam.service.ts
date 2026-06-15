import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SteamApiService } from './steam-api.service';
import { parseSteamIdInput } from './steam-id.util';
import { MusicEventsService } from '../events/music-events.service';
import { MlClientService } from '../ml/ml-client.service';

const GAMER_SYSTEM =
  'Eres el narrador de Sonora describiendo a alguien COMO JUGADOR. Escribe en español, ' +
  'segunda persona, con personalidad y un punto de humor cómplice. 2-3 frases que capturen ' +
  'su identidad gamer a partir de los datos (no inventes juegos ni cifras). Sin markdown ni comillas.';

@Injectable()
export class SteamService {
  private readonly logger = new Logger(SteamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: SteamApiService,
    private readonly events: MusicEventsService,
    private readonly ml: MlClientService,
  ) {}

  /** An AI-written "así juegas tú" paragraph from the user's Steam shape. */
  async gamerInsight(userId: string): Promise<{ text: string | null; model: string | null }> {
    const [row] = await this.prisma.$queryRaw<
      Array<{ hours: number; games: number; unplayed: number; topgame: string | null; topgenre: string | null; tophours: number }>
    >`
      WITH base AS (
        SELECT COALESCE(ROUND(SUM(ug."playtimeForever")/60.0),0)::int AS hours,
               COUNT(*)::int AS games,
               COUNT(*) FILTER (WHERE ug."playtimeForever"=0)::int AS unplayed
        FROM user_games ug WHERE ug."userId" = ${userId}
      ),
      top AS (
        SELECT g.name AS topgame, ROUND(ug."playtimeForever"/60.0)::int AS tophours
        FROM user_games ug JOIN steam_games g ON g.id = ug."gameId"
        WHERE ug."userId" = ${userId} ORDER BY ug."playtimeForever" DESC LIMIT 1
      ),
      genre AS (
        SELECT unnest(g.genres) AS topgenre, SUM(ug."playtimeForever") AS m
        FROM user_games ug JOIN steam_games g ON g.id = ug."gameId"
        WHERE ug."userId" = ${userId} AND array_length(g.genres,1) > 0
        GROUP BY 1 ORDER BY 2 DESC LIMIT 1
      )
      SELECT base.hours, base.games, base.unplayed,
             top.topgame, genre.topgenre, COALESCE(top.tophours,0) AS tophours
      FROM base LEFT JOIN top ON true LEFT JOIN genre ON true
    `;
    if (!row || row.games === 0) return { text: null, model: null };

    const prompt =
      `Horas totales: ${row.hours}. Juegos: ${row.games}. Sin abrir: ${row.unplayed}. ` +
      `Juego favorito: ${row.topgame ?? '—'} (${row.tophours}h). Género dominante: ${row.topgenre ?? '—'}.` +
      `\n\nDescribe a este jugador.`;
    const ai = await this.ml.narrate(prompt, GAMER_SYSTEM, 220);
    return { text: ai?.text ?? null, model: ai?.model ?? null };
  }

  /** Link a Steam account from a SteamID64, vanity name, or profile URL. */
  async link(userId: string, input: string) {
    const steamId = await this.resolveInput(input.trim());
    const player = await this.api.getPlayer(steamId);
    if (!player) throw new NotFoundException('No se encontró el perfil de Steam.');
    const steamLevel = await this.api.getSteamLevel(steamId);
    const timeCreated = player.timecreated ? new Date(player.timecreated * 1000) : null;

    const profile = {
      steamId,
      personaName: player.personaname,
      avatarUrl: player.avatarfull,
      profileUrl: player.profileurl,
      country: player.loccountrycode,
      steamLevel,
      timeCreated,
    };
    await this.prisma.steamAccount.upsert({
      where: { userId },
      create: { userId, ...profile },
      update: profile,
    });

    const synced = await this.sync(userId);
    return { steamId, personaName: player.personaname, ...synced };
  }

  async me(userId: string) {
    return this.prisma.steamAccount.findUnique({ where: { userId } });
  }

  /**
   * Pull owned games + playtime into the catalog and the per-user join. Records
   * a SteamSyncLog (hours delta, games, duration, errors) for the debug panel.
   * `full` forces a fresh snapshot + a bigger detail-enrich pass.
   */
  async sync(userId: string, opts?: { full?: boolean }): Promise<{ games: number }> {
    const account = await this.prisma.steamAccount.findUnique({ where: { userId } });
    if (!account) throw new BadRequestException('No hay cuenta de Steam vinculada.');

    const started = Date.now();
    const hoursBefore = await this.totalHoursOf(userId);
    let games = 0;
    let error: string | null = null;
    try {
      const owned = await this.api.getOwnedGames(account.steamId);
      games = owned.length;
      for (const g of owned) {
        const game = await this.prisma.steamGame.upsert({
          where: { appId: g.appid },
          create: { appId: g.appid, name: g.name ?? `App ${g.appid}`, iconUrl: this.api.iconUrl(g.appid, g.img_icon_url) },
          update: { name: g.name ?? undefined, iconUrl: this.api.iconUrl(g.appid, g.img_icon_url) },
          select: { id: true },
        });
        const data = {
          playtimeForever: g.playtime_forever ?? 0,
          playtime2Weeks: g.playtime_2weeks ?? 0,
          lastPlayedAt: g.rtime_last_played ? new Date(g.rtime_last_played * 1000) : null,
        };
        await this.prisma.userGame.upsert({
          where: { uniq_user_game: { userId, gameId: game.id } },
          create: { userId, gameId: game.id, ...data },
          update: data,
        });
      }
      // Refresh profile (level/age/persona) on full syncs or when we don't have it yet.
      if (opts?.full || account.steamLevel == null || account.timeCreated == null) {
        const [player, level] = await Promise.all([
          this.api.getPlayer(account.steamId).catch(() => null),
          this.api.getSteamLevel(account.steamId).catch(() => null),
        ]);
        await this.prisma.steamAccount.update({
          where: { userId },
          data: {
            lastSyncedAt: new Date(),
            steamLevel: level ?? undefined,
            personaName: player?.personaname ?? undefined,
            avatarUrl: player?.avatarfull ?? undefined,
            timeCreated: player?.timecreated ? new Date(player.timecreated * 1000) : undefined,
          },
        });
      } else {
        await this.prisma.steamAccount.update({ where: { userId }, data: { lastSyncedAt: new Date() } });
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    const hoursAfter = await this.totalHoursOf(userId);
    await this.prisma.steamSyncLog.create({
      data: {
        userId,
        gamesReceived: games,
        hoursBefore,
        hoursAfter,
        diffHours: hoursAfter - hoursBefore,
        durationMs: Date.now() - started,
        full: opts?.full ?? false,
        error,
      },
    });
    if (error) throw new BadRequestException(`La sincronización con Steam falló: ${error}`);

    await this.enrichGameDetails(userId, opts?.full ? 60 : 20).catch((e) =>
      this.logger.warn(`Detail enrich failed for ${userId}: ${e instanceof Error ? e.message : e}`),
    );
    await this.captureSnapshot(userId, opts?.full).catch((e) =>
      this.logger.warn(`Snapshot failed for ${userId}: ${e instanceof Error ? e.message : e}`),
    );
    await this.events
      .generate(userId)
      .catch((e) => this.logger.warn(`Events failed for ${userId}: ${e instanceof Error ? e.message : e}`));
    this.logger.log(`Steam sync ${userId}: ${games} games (+${hoursAfter - hoursBefore}h)`);
    return { games };
  }

  private async totalHoursOf(userId: string): Promise<number> {
    const [row] = await this.prisma.$queryRaw<Array<{ h: number }>>`
      SELECT COALESCE(ROUND(SUM("playtimeForever") / 60.0), 0)::int AS h
      FROM user_games WHERE "userId" = ${userId}
    `;
    return row?.h ?? 0;
  }

  /** Latest sync diagnostics for the debug panel. */
  async syncDebug(userId: string) {
    const [account, logs] = await Promise.all([
      this.prisma.steamAccount.findUnique({ where: { userId }, select: { lastSyncedAt: true, personaName: true } }),
      this.prisma.steamSyncLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 8 }),
    ]);
    return { lastSyncedAt: account?.lastSyncedAt ?? null, logs };
  }

  /**
   * Capture a point-in-time snapshot of total playtime (deduped to ~once a day).
   * Steam exposes no history, so these accumulate into real monthly evolution.
   */
  async captureSnapshot(userId: string, force = false): Promise<void> {
    const last = await this.prisma.steamSnapshot.findFirst({
      where: { userId },
      orderBy: { capturedAt: 'desc' },
      select: { capturedAt: true },
    });
    if (!force && last && Date.now() - last.capturedAt.getTime() < 20 * 3_600_000) return;

    const [row] = await this.prisma.$queryRaw<Array<{ mins: number; games: number; played: number }>>`
      SELECT COALESCE(SUM("playtimeForever"), 0)::int AS mins,
             COUNT(*)::int AS games,
             COUNT(*) FILTER (WHERE "playtimeForever" > 0)::int AS played
      FROM user_games WHERE "userId" = ${userId}
    `;
    await this.prisma.steamSnapshot.create({
      data: {
        userId,
        totalMinutes: row?.mins ?? 0,
        gameCount: row?.games ?? 0,
        playedCount: row?.played ?? 0,
      },
    });

    // Per-game snapshots (played games only) build the incremental timeline that
    // powers momentum: hours gained today/this week, games that rose, resumes.
    const played = await this.prisma.userGame.findMany({
      where: { userId, playtimeForever: { gt: 0 } },
      select: { game: { select: { appId: true } }, playtimeForever: true, playtime2Weeks: true },
    });
    if (played.length > 0) {
      await this.prisma.steamGameSnapshot.createMany({
        data: played.map((p) => ({
          userId,
          appId: p.game.appId,
          playtimeForever: p.playtimeForever,
          playtime2Weeks: p.playtime2Weeks,
        })),
      });
    }
  }

  /**
   * "Momentum" — the incremental gaming timeline Steam itself doesn't give. From
   * the per-game snapshots: hours gained today / this week, which games rose the
   * most, what's been played recently (Steam's own 2-week field), and resumes
   * (a game active again after a dormant baseline). Snapshot-derived parts fill
   * in as snapshots accumulate; recentlyPlayed works immediately.
   */
  async momentum(userId: string) {
    const now = Date.now();
    const dayCut = new Date(now - 12 * 3_600_000);
    const weekCut = new Date(now - 6 * 86_400_000);

    const current = await this.prisma.userGame.findMany({
      where: { userId, playtimeForever: { gt: 0 } },
      include: { game: true },
    });

    // Latest snapshot per game at or before a cutoff (Postgres DISTINCT ON).
    const baselineAt = async (cut: Date) => {
      const rows = await this.prisma.$queryRaw<Array<{ appId: number; mins: number; w2: number }>>`
        SELECT DISTINCT ON ("appId") "appId", "playtimeForever" AS mins, "playtime2Weeks" AS w2
        FROM steam_game_snapshots
        WHERE "userId" = ${userId} AND "capturedAt" <= ${cut}
        ORDER BY "appId", "capturedAt" DESC
      `;
      return new Map(rows.map((r) => [r.appId, { mins: r.mins, w2: r.w2 }]));
    };
    const [dayBase, weekBase] = await Promise.all([baselineAt(dayCut), baselineAt(weekCut)]);

    type Ug = (typeof current)[number];
    let gainedTodayMin = 0;
    let gainedWeekMin = 0;
    const rose: Array<{ ug: Ug; gainedMin: number }> = [];
    const resumed: Ug[] = [];

    for (const ug of current) {
      const appId = ug.game.appId;
      const d = dayBase.get(appId);
      const w = weekBase.get(appId);
      if (d) gainedTodayMin += Math.max(0, ug.playtimeForever - d.mins);
      if (w) gainedWeekMin += Math.max(0, ug.playtimeForever - w.mins);
      const base = w ?? d;
      if (base && ug.playtimeForever - base.mins > 0) {
        rose.push({ ug, gainedMin: ug.playtimeForever - base.mins });
        // Resumed: active again now, but the baseline showed it dormant (0 in 2 weeks).
        if (ug.playtime2Weeks > 0 && base.w2 === 0) resumed.push(ug);
      }
    }

    rose.sort((a, b) => b.gainedMin - a.gainedMin);

    const r1 = (m: number) => Math.round((m / 60) * 10) / 10;
    return {
      gainedTodayHours: r1(gainedTodayMin),
      gainedWeekHours: r1(gainedWeekMin),
      hasBaseline: dayBase.size > 0 || weekBase.size > 0,
      recentlyPlayed: current
        .filter((c) => c.playtime2Weeks > 0)
        .sort((a, b) => b.playtime2Weeks - a.playtime2Weeks)
        .slice(0, 8)
        .map((c) => this.toGameDto(c)),
      rose: rose.slice(0, 8).map((x) => ({ ...this.toGameDto(x.ug), gainedHours: r1(x.gainedMin) })),
      resumed: resumed.slice(0, 6).map((ug) => this.toGameDto(ug)),
    };
  }

  /** Cumulative-hours time series from snapshots (fills in as they accumulate). */
  async evolution(userId: string): Promise<{ points: { date: Date; hours: number }[]; monthly: { month: string; hours: number }[] }> {
    const snaps = await this.prisma.steamSnapshot.findMany({
      where: { userId },
      orderBy: { capturedAt: 'asc' },
      select: { capturedAt: true, totalMinutes: true },
    });
    const points = snaps.map((s) => ({ date: s.capturedAt, hours: Math.round(s.totalMinutes / 60) }));

    // Hours gained per month = last snapshot of the month minus the prior month's.
    const byMonth = new Map<string, number>();
    for (const s of snaps) {
      const m = s.capturedAt.toISOString().slice(0, 7);
      byMonth.set(m, Math.round(s.totalMinutes / 60)); // last write wins (latest in month)
    }
    const months = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
    const monthly = months.map(([month, hours], i) => ({
      month,
      hours: i === 0 ? 0 : Math.max(0, hours - months[i - 1][1]),
    }));
    return { points, monthly };
  }

  /**
   * "Steam Profile Snapshot" — the full SteamDB-style account state in one call:
   * identity (persona/avatar/level/account-age), hard counts/averages/medians,
   * library value & $-per-hour, the record game, and a 10-bucket playtime
   * histogram. This is the user's "estado de cuenta gamer".
   */
  async snapshot(userId: string) {
    const account = await this.prisma.steamAccount.findUnique({ where: { userId } });

    const [row] = await this.prisma.$queryRaw<
      Array<{
        total_games: number;
        played_games: number;
        total_minutes: bigint;
        median_minutes: number | null;
        median_played_minutes: number | null;
        priced: number;
        total_cents: bigint;
        h0: number; h1: number; h2: number; h5: number; h10: number;
        h20: number; h50: number; h100: number; h200: number; h200p: number;
      }>
    >`
      SELECT
        COUNT(*)::int AS total_games,
        COUNT(*) FILTER (WHERE ug."playtimeForever" > 0)::int AS played_games,
        COALESCE(SUM(ug."playtimeForever"), 0)::bigint AS total_minutes,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ug."playtimeForever")::float AS median_minutes,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ug."playtimeForever")
          FILTER (WHERE ug."playtimeForever" > 0)::float AS median_played_minutes,
        COUNT(*) FILTER (WHERE g."priceCents" IS NOT NULL)::int AS priced,
        COALESCE(SUM(g."priceCents"), 0)::bigint AS total_cents,
        COUNT(*) FILTER (WHERE ug."playtimeForever" = 0)::int AS h0,
        COUNT(*) FILTER (WHERE ug."playtimeForever" > 0    AND ug."playtimeForever" < 60)::int    AS h1,
        COUNT(*) FILTER (WHERE ug."playtimeForever" >= 60  AND ug."playtimeForever" < 120)::int   AS h2,
        COUNT(*) FILTER (WHERE ug."playtimeForever" >= 120 AND ug."playtimeForever" < 300)::int   AS h5,
        COUNT(*) FILTER (WHERE ug."playtimeForever" >= 300 AND ug."playtimeForever" < 600)::int   AS h10,
        COUNT(*) FILTER (WHERE ug."playtimeForever" >= 600 AND ug."playtimeForever" < 1200)::int  AS h20,
        COUNT(*) FILTER (WHERE ug."playtimeForever" >= 1200 AND ug."playtimeForever" < 3000)::int AS h50,
        COUNT(*) FILTER (WHERE ug."playtimeForever" >= 3000 AND ug."playtimeForever" < 6000)::int AS h100,
        COUNT(*) FILTER (WHERE ug."playtimeForever" >= 6000 AND ug."playtimeForever" < 12000)::int AS h200,
        COUNT(*) FILTER (WHERE ug."playtimeForever" >= 12000)::int AS h200p
      FROM user_games ug JOIN steam_games g ON g.id = ug."gameId"
      WHERE ug."userId" = ${userId}
    `;

    const topRow = await this.prisma.userGame.findFirst({
      where: { userId },
      orderBy: { playtimeForever: 'desc' },
      include: { game: true },
    });

    const totalGames = row?.total_games ?? 0;
    const playedGames = row?.played_games ?? 0;
    const totalMinutes = Number(row?.total_minutes ?? 0n);
    const totalHours = Math.round(totalMinutes / 60);
    const totalValue = Math.round(Number(row?.total_cents ?? 0n)) / 100;
    const priced = row?.priced ?? 0;
    const r1 = (n: number) => Math.round(n * 10) / 10;
    const accountAgeYears = account?.timeCreated
      ? r1((Date.now() - account.timeCreated.getTime()) / (365.25 * 86_400_000))
      : null;

    return {
      account: account
        ? {
            personaName: account.personaName,
            avatarUrl: account.avatarUrl,
            profileUrl: account.profileUrl,
            country: account.country,
            steamLevel: account.steamLevel,
            memberSince: account.timeCreated,
            accountAgeYears,
            lastSyncedAt: account.lastSyncedAt,
          }
        : null,
      totalGames,
      playedGames,
      unplayedGames: totalGames - playedGames,
      playedPercent: totalGames ? Math.round((playedGames / totalGames) * 100) : 0,
      totalHours,
      avgHoursPerGame: totalGames ? r1(totalMinutes / 60 / totalGames) : 0,
      avgHoursPerPlayedGame: playedGames ? r1(totalMinutes / 60 / playedGames) : 0,
      medianHours: row?.median_minutes != null ? r1(row.median_minutes / 60) : 0,
      medianPlayedHours: row?.median_played_minutes != null ? r1(row.median_played_minutes / 60) : 0,
      topGame: topRow
        ? {
            appId: topRow.game.appId,
            name: topRow.game.name,
            iconUrl: topRow.game.iconUrl,
            hours: r1(topRow.playtimeForever / 60),
          }
        : null,
      estimatedValue: totalValue,
      avgGamePrice: priced ? Math.round((totalValue / priced) * 100) / 100 : 0,
      costPerHour: totalHours > 0 ? Math.round((totalValue / totalHours) * 100) / 100 : 0,
      pricedCount: priced,
      coveragePct: totalGames ? Math.round((priced / totalGames) * 100) : 0,
      histogram: [
        { label: '0h', key: 'h0', count: row?.h0 ?? 0 },
        { label: '0–1h', key: 'h1', count: row?.h1 ?? 0 },
        { label: '1–2h', key: 'h2', count: row?.h2 ?? 0 },
        { label: '2–5h', key: 'h5', count: row?.h5 ?? 0 },
        { label: '5–10h', key: 'h10', count: row?.h10 ?? 0 },
        { label: '10–20h', key: 'h20', count: row?.h20 ?? 0 },
        { label: '20–50h', key: 'h50', count: row?.h50 ?? 0 },
        { label: '50–100h', key: 'h100', count: row?.h100 ?? 0 },
        { label: '100–200h', key: 'h200', count: row?.h200 ?? 0 },
        { label: '200h+', key: 'h200p', count: row?.h200p ?? 0 },
      ],
    };
  }

  /**
   * SteamDB-style economics: current store value of your library (total / played
   * / unplayed), $-per-hour, and the distribution of games by time played.
   * Prices are current store prices for games we've enriched (coverage shown).
   */
  async economy(userId: string) {
    const [row] = await this.prisma.$queryRaw<
      Array<{
        total_games: number;
        priced: number;
        total_cents: bigint;
        played_cents: bigint;
        unplayed_cents: bigint;
        total_minutes: bigint;
        b_pending: number;
        b_barely: number;
        b_tried: number;
        b_played: number;
        b_heavy: number;
        b_legend: number;
      }>
    >`
      SELECT
        COUNT(*)::int AS total_games,
        COUNT(*) FILTER (WHERE g."priceCents" IS NOT NULL)::int AS priced,
        COALESCE(SUM(g."priceCents"), 0)::bigint AS total_cents,
        COALESCE(SUM(g."priceCents") FILTER (WHERE ug."playtimeForever" > 0), 0)::bigint AS played_cents,
        COALESCE(SUM(g."priceCents") FILTER (WHERE ug."playtimeForever" = 0), 0)::bigint AS unplayed_cents,
        COALESCE(SUM(ug."playtimeForever"), 0)::bigint AS total_minutes,
        COUNT(*) FILTER (WHERE ug."playtimeForever" = 0)::int AS b_pending,
        COUNT(*) FILTER (WHERE ug."playtimeForever" > 0 AND ug."playtimeForever" < 120)::int AS b_barely,
        COUNT(*) FILTER (WHERE ug."playtimeForever" >= 120 AND ug."playtimeForever" < 600)::int AS b_tried,
        COUNT(*) FILTER (WHERE ug."playtimeForever" >= 600 AND ug."playtimeForever" < 3000)::int AS b_played,
        COUNT(*) FILTER (WHERE ug."playtimeForever" >= 3000 AND ug."playtimeForever" < 6000)::int AS b_heavy,
        COUNT(*) FILTER (WHERE ug."playtimeForever" >= 6000)::int AS b_legend
      FROM user_games ug JOIN steam_games g ON g.id = ug."gameId"
      WHERE ug."userId" = ${userId}
    `;
    const dollars = (c: bigint) => Math.round(Number(c)) / 100;
    const totalValue = dollars(row?.total_cents ?? 0n);
    const totalHours = Math.round(Number(row?.total_minutes ?? 0n) / 60);
    return {
      totalValue,
      playedValue: dollars(row?.played_cents ?? 0n),
      unplayedValue: dollars(row?.unplayed_cents ?? 0n),
      pricedCount: row?.priced ?? 0,
      totalGames: row?.total_games ?? 0,
      coveragePct: row?.total_games ? Math.round((row.priced / row.total_games) * 100) : 0,
      totalHours,
      pricePerHour: totalHours > 0 ? Math.round((totalValue / totalHours) * 100) / 100 : 0,
      buckets: {
        pending: row?.b_pending ?? 0,
        barely: row?.b_barely ?? 0,
        tried: row?.b_tried ?? 0,
        played: row?.b_played ?? 0,
        heavy: row?.b_heavy ?? 0,
        legend: row?.b_legend ?? 0,
      },
    };
  }

  /** Genre breakdown by hours played, from enriched store genres. */
  async genreBreakdown(userId: string): Promise<{ genres: { genre: string; hours: number }[]; topGenre: string | null; enrichedPct: number }> {
    const rows = await this.prisma.$queryRaw<Array<{ genre: string; mins: number }>>`
      SELECT unnest(g.genres) AS genre, SUM(ug."playtimeForever")::int AS mins
      FROM user_games ug JOIN steam_games g ON g.id = ug."gameId"
      WHERE ug."userId" = ${userId} AND array_length(g.genres, 1) > 0
      GROUP BY 1 ORDER BY 2 DESC LIMIT 12
    `;
    const [cov] = await this.prisma.$queryRaw<Array<{ enriched: number; total: number }>>`
      SELECT COUNT(*) FILTER (WHERE g."genresAt" IS NOT NULL)::int AS enriched, COUNT(*)::int AS total
      FROM user_games ug JOIN steam_games g ON g.id = ug."gameId" WHERE ug."userId" = ${userId}
    `;
    const genres = rows.map((r) => ({ genre: r.genre, hours: Math.round(r.mins / 60) }));
    return {
      genres,
      topGenre: genres[0]?.genre ?? null,
      enrichedPct: cov?.total ? Math.round((cov.enriched / cov.total) * 100) : 0,
    };
  }

  /**
   * Fill in genres for the user's games from the Steam store API (no key).
   * Prioritizes most-played games and only touches games not enriched yet
   * (genresAt = null), bounded per call and gently paced to respect the public
   * store rate limit. So it fills in progressively across syncs.
   */
  async enrichGameDetails(userId: string, limit = 40, unplayedFirst = false): Promise<{ enriched: number }> {
    const pending = await this.prisma.userGame.findMany({
      where: { userId, game: { genresAt: null } },
      orderBy: unplayedFirst ? { playtimeForever: 'asc' } : { playtimeForever: 'desc' },
      take: limit,
      select: { game: { select: { id: true, appId: true } } },
    });
    let enriched = 0;
    for (const { game } of pending) {
      const d = await this.api.getAppDetails(game.appId);
      if (d.rateLimited) break; // stop; leave genresAt null so these retry next time
      await this.prisma.steamGame.update({
        where: { id: game.id },
        data: {
          genres: d.genres,
          metacritic: d.metacritic,
          recommendations: d.recommendations,
          priceCents: d.priceCents,
          isFree: d.isFree,
          genresAt: new Date(),
        },
      });
      if (d.genres.length > 0 || d.metacritic != null) enriched += 1;
      await new Promise((r) => setTimeout(r, 400));
    }
    return { enriched };
  }

  async stats(userId: string) {
    const [agg, played, top, recent] = await Promise.all([
      this.prisma.userGame.aggregate({
        where: { userId },
        _sum: { playtimeForever: true },
        _count: true,
      }),
      this.prisma.userGame.count({ where: { userId, playtimeForever: { gt: 0 } } }),
      this.topGames(userId, 10),
      this.recentGames(userId),
    ]);

    const totalMinutes = agg._sum.playtimeForever ?? 0;
    return {
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60),
      gameCount: agg._count,
      playedCount: played,
      unplayedCount: agg._count - played,
      avgHoursPlayed: played > 0 ? Math.round(totalMinutes / 60 / played) : 0,
      topGames: top,
      recentGames: recent,
    };
  }

  /** Full library — every owned game, for the searchable/sortable list. */
  async library(userId: string) {
    const rows = await this.prisma.userGame.findMany({
      where: { userId },
      orderBy: { playtimeForever: 'desc' },
      include: { game: true },
    });
    return rows.map((r) => this.toGameDto(r));
  }

  /** Backlog analysis: never-played, barely-touched, and the existential message. */
  async backlog(userId: string) {
    const rows = await this.prisma.userGame.findMany({ where: { userId }, include: { game: true } });
    const total = rows.length;
    const never = rows.filter((r) => r.playtimeForever === 0);
    const barely = rows.filter((r) => r.playtimeForever > 0 && r.playtimeForever < 120); // < 2h
    const playedCount = total - never.length;

    return {
      total,
      playedCount,
      neverPlayedCount: never.length,
      barelyTouchedCount: barely.length,
      completionPct: total ? Math.round((playedCount / total) * 100) : 0,
      neverPlayed: never
        .map((r) => this.toGameDto(r))
        .sort((a, b) => a.name.localeCompare(b.name)),
      message: this.backlogMessage(never.length, total),
    };
  }

  private backlogMessage(never: number, total: number): string {
    if (total === 0) return 'Sin juegos en la biblioteca.';
    if (never === 0) return '¡No tienes backlog! Lo jugaste todo. Respeto absoluto. 🫡';
    const pct = Math.round((never / total) * 100);
    return `Tu backlog tiene ${never} juegos sin tocar (${pct}% de tu biblioteca). Valor emocional: alto. Valor financiero: mejor no mirar. 🔥`;
  }

  async topGames(userId: string, limit: number) {
    const rows = await this.prisma.userGame.findMany({
      where: { userId, playtimeForever: { gt: 0 } },
      orderBy: { playtimeForever: 'desc' },
      take: limit,
      include: { game: true },
    });
    return rows.map((r) => this.toGameDto(r));
  }

  private async recentGames(userId: string) {
    const rows = await this.prisma.userGame.findMany({
      where: { userId, playtime2Weeks: { gt: 0 } },
      orderBy: { playtime2Weeks: 'desc' },
      take: 8,
      include: { game: true },
    });
    return rows.map((r) => this.toGameDto(r));
  }

  /** A single game's detail for /steam/game/:appId. */
  async game(userId: string, appId: number) {
    const r = await this.prisma.userGame.findFirst({
      where: { userId, game: { appId } },
      include: { game: true },
    });
    if (!r) throw new NotFoundException('No tienes ese juego.');
    return this.toGameDto(r);
  }

  private toGameDto(r: {
    playtimeForever: number;
    playtime2Weeks: number;
    lastPlayedAt: Date | null;
    game: {
      appId: number;
      name: string;
      iconUrl: string | null;
      genres?: string[];
      metacritic?: number | null;
      recommendations?: number | null;
      priceCents?: number | null;
      isFree?: boolean | null;
    };
  }) {
    return {
      appId: r.game.appId,
      name: r.game.name,
      iconUrl: r.game.iconUrl,
      headerUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${r.game.appId}/header.jpg`,
      hoursForever: Math.round((r.playtimeForever / 60) * 10) / 10,
      hours2Weeks: Math.round((r.playtime2Weeks / 60) * 10) / 10,
      lastPlayedAt: r.lastPlayedAt,
      genres: r.game.genres ?? [],
      metacritic: r.game.metacritic ?? null,
      recommendations: r.game.recommendations ?? null,
      priceCents: r.game.priceCents ?? null,
      isFree: r.game.isFree ?? null,
    };
  }

  // ── input parsing ──

  private async resolveInput(input: string): Promise<string> {
    const parsed = parseSteamIdInput(input);
    if (parsed.kind === 'id') return parsed.steamId;

    const resolved = await this.api.resolveVanity(parsed.vanity);
    if (!resolved) {
      throw new BadRequestException(
        'No se pudo resolver. Pega tu SteamID64 (17 dígitos), tu URL personalizada o el nombre de tu vanity URL.',
      );
    }
    return resolved;
  }
}
