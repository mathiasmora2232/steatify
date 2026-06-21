import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SpotifyModule } from './spotify/spotify.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { StatsModule } from './stats/stats.module';
import { AchievementsModule } from './achievements/achievements.module';
import { ErasModule } from './eras/eras.module';
import { InsightsModule } from './insights/insights.module';
import { PredictionsModule } from './predictions/predictions.module';
import { ImportModule } from './import/import.module';
import { SteamModule } from './steam/steam.module';
import { AdminModule } from './admin/admin.module';
import { DnaModule } from './dna/dna.module';
import { TrendsModule } from './trends/trends.module';
import { SongsModule } from './songs/songs.module';
import { ChartsModule } from './charts/charts.module';
import { MusicEventsModule } from './events/music-events.module';
import { WrappedModule } from './wrapped/wrapped.module';
import { ConnectionsModule } from './connections/connections.module';
import { ProfileModule } from './profile/profile.module';
import { ArtistsModule } from './artists/artists.module';
import { AlbumsModule } from './albums/albums.module';
import { CompareModule } from './compare/compare.module';
import { SocialModule } from './social/social.module';
import { CacheModule } from './cache/cache.module';
import { SearchModule } from './search/search.module';
import { BrainModule } from './brain/brain.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      // The .env lives at the monorepo root, but the backend runs from backend/.
      // In Docker, vars are injected via env_file and these paths simply don't exist.
      envFilePath: ['../.env', '.env'],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    // Shared BullMQ connection for all queues. Prefer REDIS_URL (includes auth,
    // e.g. managed Redis on Railway/Upstash); fall back to host/port for local.
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: process.env.REDIS_URL
          ? { url: process.env.REDIS_URL }
          : {
              host: process.env.REDIS_HOST ?? 'localhost',
              port: Number(process.env.REDIS_PORT ?? 6379),
              password: process.env.REDIS_PASSWORD || undefined,
            },
      }),
    }),
    PrismaModule,
    HealthModule,
    SpotifyModule,
    AuthModule,
    UsersModule,
    IngestionModule,
    StatsModule,
    AchievementsModule,
    ErasModule,
    InsightsModule,
    PredictionsModule,
    ImportModule,
    SteamModule,
    AdminModule,
    DnaModule,
    TrendsModule,
    SongsModule,
    ChartsModule,
    MusicEventsModule,
    WrappedModule,
    ConnectionsModule,
    ProfileModule,
    CacheModule,
    ArtistsModule,
    AlbumsModule,
    CompareModule,
    SocialModule,
    SearchModule,
    BrainModule,
  ],
})
export class AppModule {}
