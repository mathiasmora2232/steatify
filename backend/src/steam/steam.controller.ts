import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { SteamService } from './steam.service';
import { SteamApiService } from './steam-api.service';

class LinkSteamDto {
  @IsString()
  @MinLength(2)
  input!: string;
}

@UseGuards(JwtAuthGuard)
@Controller('steam')
export class SteamController {
  constructor(
    private readonly steam: SteamService,
    private readonly api: SteamApiService,
  ) {}

  /** Whether the server has a Steam key configured at all. */
  @Get('available')
  available() {
    return { available: this.api.hasKey() };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.steam.me(user.id);
  }

  /** Link by SteamID64, vanity name, or profile URL; runs an initial sync. */
  @Post('link')
  link(@CurrentUser() user: AuthUser, @Body() dto: LinkSteamDto) {
    return this.steam.link(user.id, dto.input);
  }

  @Post('sync')
  sync(@CurrentUser() user: AuthUser, @Query('full') full?: string) {
    return this.steam.sync(user.id, { full: full === 'true' || full === '1' });
  }

  @Get('sync-debug')
  syncDebug(@CurrentUser() user: AuthUser) {
    return this.steam.syncDebug(user.id);
  }

  @Get('snapshot')
  snapshot(@CurrentUser() user: AuthUser) {
    return this.steam.snapshot(user.id);
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.steam.stats(user.id);
  }

  @Get('genres')
  genres(@CurrentUser() user: AuthUser) {
    return this.steam.genreBreakdown(user.id);
  }

  @Get('economy')
  economy(@CurrentUser() user: AuthUser) {
    return this.steam.economy(user.id);
  }

  @Get('evolution')
  evolution(@CurrentUser() user: AuthUser) {
    return this.steam.evolution(user.id);
  }

  @Get('momentum')
  momentum(@CurrentUser() user: AuthUser) {
    return this.steam.momentum(user.id);
  }

  @Get('insight')
  insight(@CurrentUser() user: AuthUser) {
    return this.steam.gamerInsight(user.id);
  }

  @Get('games')
  games(@CurrentUser() user: AuthUser) {
    return this.steam.topGames(user.id, 100);
  }

  /** Full owned-games library (searched/sorted client-side). */
  @Get('library')
  library(@CurrentUser() user: AuthUser) {
    return this.steam.library(user.id);
  }

  @Get('game/:appId')
  game(@CurrentUser() user: AuthUser, @Param('appId', ParseIntPipe) appId: number) {
    return this.steam.game(user.id, appId);
  }

  /** Backlog analysis (never-played, barely-touched, completion). */
  @Get('backlog')
  backlog(@CurrentUser() user: AuthUser) {
    return this.steam.backlog(user.id);
  }
}
