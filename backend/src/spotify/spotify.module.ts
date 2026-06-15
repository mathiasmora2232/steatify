import { Module } from '@nestjs/common';
import { SpotifyApiService } from './spotify-api.service';
import { SpotifyTokensService } from './spotify-tokens.service';

@Module({
  providers: [SpotifyApiService, SpotifyTokensService],
  exports: [SpotifyApiService, SpotifyTokensService],
})
export class SpotifyModule {}
