import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SteamService } from './steam.service';

/**
 * Re-syncs every linked Steam account periodically. Playtime changes slowly, so
 * every 6h is plenty (vs. the 30-min music polling). Sequential to stay gentle
 * on the shared Web API key; move to a queue if the user base grows.
 */
@Injectable()
export class SteamScheduler {
  private readonly logger = new Logger(SteamScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly steam: SteamService,
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async syncAll(): Promise<void> {
    const accounts = await this.prisma.steamAccount.findMany({ select: { userId: true } });
    if (accounts.length === 0) return;

    for (const a of accounts) {
      await this.steam
        .sync(a.userId)
        .catch((e) => this.logger.warn(`Steam sync failed for ${a.userId}: ${e instanceof Error ? e.message : e}`));
    }
    this.logger.log(`Steam auto-sync: ${accounts.length} accounts`);
  }
}
