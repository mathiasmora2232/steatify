import { Injectable, ForbiddenException } from '@nestjs/common';
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

  /** Only ADMIN / SUPER_ADMIN may operate the product. */
  async requireAdmin(userId: string): Promise<'ADMIN' | 'SUPER_ADMIN'> {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!u || u.role === 'USER') throw new ForbiddenException('Solo administradores.');
    return u.role;
  }

  /** Product-wide metrics for the admin panel (operate, don't stalk). */
  async metrics(requesterId: string) {
    await this.requireAdmin(requesterId);
    const now = Date.now();
    const d1 = new Date(now - 864e5);
    const d7 = new Date(now - 7 * 864e5);
    const d30 = new Date(now - 30 * 864e5);

    const [
      totalUsers, newToday, new7d, withPassword, suspended,
      spotify, steam,
      synced1d, synced7d, synced30d, loggedIn,
      insights, plans, sync, importc, db, redis, plays, games, waitlist,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: d1 } } }),
      this.prisma.user.count({ where: { createdAt: { gte: d7 } } }),
      this.prisma.user.count({ where: { passwordHash: { not: null } } }),
      this.prisma.user.count({ where: { suspendedAt: { not: null } } }),
      this.prisma.spotifyAccount.count(),
      this.prisma.steamAccount.count(),
      this.prisma.user.count({ where: { lastSyncedAt: { gte: d1 } } }),
      this.prisma.user.count({ where: { lastSyncedAt: { gte: d7 } } }),
      this.prisma.user.count({ where: { lastSyncedAt: { gte: d30 } } }),
      this.prisma.$queryRaw<Array<{ c: number }>>`SELECT COUNT(DISTINCT "userId")::int AS c FROM sessions WHERE "revokedAt" IS NULL AND "expiresAt" > now()`,
      this.prisma.aiInsight.count(),
      this.prisma.user.groupBy({ by: ['plan'], _count: true }),
      this.syncQueue.getJobCounts().catch(() => null),
      this.importQueue.getJobCounts().catch(() => null),
      this.dbStatus(),
      this.redisStatus(),
      this.prisma.listeningHistory.count(),
      this.prisma.userGame.count(),
      this.prisma.waitlistEntry.count(),
    ]);
    const planMap = Object.fromEntries(plans.map((p) => [p.plan, p._count])) as Record<string, number>;
    return {
      users: { total: totalUsers, newToday, new7d, suspended, withPassword },
      connections: { spotify, steam },
      activity: { syncedToday: synced1d, synced7d, synced30d, loggedIn: loggedIn[0]?.c ?? 0 },
      plans: { FREE: planMap.FREE ?? 0, PLUS: planMap.PLUS ?? 0, PRO: planMap.PRO ?? 0 },
      ai: { insightsTotal: insights },
      waitlist,
      system: { db, redis, queues: { sync, import: importc } },
      data: { plays, games },
      timestamp: new Date().toISOString(),
    };
  }

  /** Recent users for the admin table — no tokens/passwords, ever. */
  async users(requesterId: string, take = 60) {
    await this.requireAdmin(requesterId);
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, take),
      select: {
        id: true, username: true, displayName: true, email: true, role: true, plan: true,
        createdAt: true, lastSyncedAt: true, suspendedAt: true, spotifyId: true,
      },
    });
  }

  /** Suspend / un-suspend an account (super admin protected from self/role targets). */
  async setSuspended(requesterId: string, targetId: string, suspended: boolean) {
    await this.requireAdmin(requesterId);
    const target = await this.prisma.user.findUnique({ where: { id: targetId }, select: { role: true } });
    if (!target) throw new ForbiddenException('Usuario no existe.');
    if (target.role !== 'USER') throw new ForbiddenException('No puedes suspender a otro admin.');
    await this.prisma.user.update({ where: { id: targetId }, data: { suspendedAt: suspended ? new Date() : null } });
    if (suspended) await this.prisma.session.updateMany({ where: { userId: targetId, revokedAt: null }, data: { revokedAt: new Date() } });
    return { ok: true };
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
