import { Module } from '@nestjs/common';
import { SpotifyModule } from '../spotify/spotify.module';
import { CatalogService } from './catalog.service';

/**
 * Shared catalog (Transform + Load) layer. Both the live sync (ingestion) and
 * the historical import depend on it, so it lives in its own module.
 */
@Module({
  imports: [SpotifyModule],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
