import { Controller, Delete, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { InsightsService } from './insights.service';

@UseGuards(JwtAuthGuard)
@Controller('insights')
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.insights.listForUser(user.id);
  }

  /** Current week's insight (cached; auto-generates once if missing). No tokens on plain refresh. */
  @Get('current')
  current(@CurrentUser() user: AuthUser) {
    return this.insights.current(user.id);
  }

  /** Manual "Regenerar" — rate-limited to 3/day. */
  @Post('generate')
  generate(@CurrentUser() user: AuthUser, @Query('manual') manual?: string) {
    return this.insights.generate(user.id, manual !== 'false');
  }

  /** Borrar insights generados. */
  @Delete()
  deleteAll(@CurrentUser() user: AuthUser) {
    return this.insights.deleteAll(user.id);
  }
}
