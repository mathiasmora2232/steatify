import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SYNC_QUEUE } from '../ingestion/ingestion.constants';
import { IMPORT_QUEUE } from '../import/import.constants';

/**
 * Internal health/observability snapshot — saves digging through logs. Reports
 * service status, queue depth, last syncs, token validity and data totals.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(SYNC_QUEUE) private readonly syncQueue: Queue,
    @InjectQueue(IMPORT_QUEUE) private readonly importQueue: Queue,
  ) {}

  async overview(userId: string) {
    const [db, redis, syncCounts, importCounts, user, spotify, steam, totals] = await Promise.all([
      this.dbStatus(),
      this.redisStatus(),
      this.syncQueue.getJobCounts().catch(() => null),
      this.importQueue.getJobCounts().catch(() => null),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { lastSyncedAt: true, tzOffset: true, syncEnabled: true },
      }),
      this.prisma.spotifyAccount.findUnique({
        where: { userId },
        select: { expiresAt: true, scope: true },
      }),
      this.prisma.steamAccount.findUnique({
        where: { userId },
        select: { lastSyncedAt: true },
      }),
      this.totals(userId),
    ]);

    const tokenExpiresAt = spotify?.expiresAt ?? null;
    return {
      timestamp: new Date().toISOString(),
      services: { db, redis },
      queues: { sync: syncCounts, import: importCounts },
      spotify: {
        lastSyncedAt: user?.lastSyncedAt ?? null,
        syncEnabled: user?.syncEnabled ?? false,
        tokenExpiresAt,
        tokenValid: tokenExpiresAt ? tokenExpiresAt.getTime() > Date.now() : false,
        scope: spotify?.scope ?? null,
      },
      steam: { lastSyncedAt: steam?.lastSyncedAt ?? null },
      tzOffset: user?.tzOffset ?? 0,
      totals,
    };
  }

  private async dbStatus(): Promise<'up' | 'down'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async redisStatus(): Promise<'up' | 'down'> {
    try {
      const client = (await this.syncQueue.client) as unknown as { ping(): Promise<string> };
      return (await client.ping()) === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }

  private async totals(userId: string) {
    const [plays, tracks, artists, games, eras, achievementsUnlocked, insights] = await Promise.all([
      this.prisma.listeningHistory.count({ where: { userId } }),
      this.prisma.track.count(),
      this.prisma.artist.count(),
      this.prisma.userGame.count({ where: { userId } }),
      this.prisma.musicEra.count({ where: { userId } }),
      this.prisma.userAchievement.count({ where: { userId, unlockedAt: { not: null } } }),
      this.prisma.aiInsight.count({ where: { userId } }),
    ]);
    return { plays, tracks, artists, games, eras, achievementsUnlocked, insights };
  }
}
