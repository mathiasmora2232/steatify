import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { TrendsService } from './trends.service';

@UseGuards(JwtAuthGuard)
@Controller('trends')
export class TrendsController {
  constructor(private readonly trends: TrendsService) {}

  @Get()
  overview(@CurrentUser() user: AuthUser, @Query('days') days?: string) {
    return this.trends.overview(user.id, this.parseDays(days));
  }

  @Get('market')
  market(@CurrentUser() user: AuthUser, @Query('days') days?: string) {
    return this.trends.market(user.id, this.parseDays(days));
  }

  @Get('songs')
  songs(@CurrentUser() user: AuthUser, @Query('days') days?: string) {
    return this.trends.songMovers(user.id, this.parseDays(days));
  }

  @Get('graveyard')
  graveyard(@CurrentUser() user: AuthUser) {
    return this.trends.graveyardPage(user.id);
  }

  @Get('graveyard/categories')
  graveyardCategories(@CurrentUser() user: AuthUser) {
    return this.trends.graveyardCategories(user.id);
  }

  private parseDays(days?: string): number {
    const n = Number(days);
    return Number.isFinite(n) && n > 0 ? n : 7;
  }
}
