import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Cap the connection pool well under Supabase's session-mode 15-client limit, so
 * bursty endpoints (e.g. the public profile, which fans out many queries at once)
 * queue instead of failing with "max clients reached". Applied here in code so it
 * works regardless of how DATABASE_URL is configured in the host env.
 */
function pooledUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || /[?&]connection_limit=/.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}connection_limit=8&pool_timeout=20`;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = pooledUrl();
    super(url ? { datasourceUrl: url } : {});
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to PostgreSQL');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
