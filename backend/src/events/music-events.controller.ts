import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { MusicEventsService } from './music-events.service';

@UseGuards(JwtAuthGuard)
@Controller('events')
export class MusicEventsController {
  constructor(private readonly events: MusicEventsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    const n = Number(limit);
    return this.events.list(user.id, Number.isFinite(n) && n > 0 ? n : 30);
  }

  /** Force a regeneration (also runs automatically on every sync/import). */
  @Post('refresh')
  async refresh(@CurrentUser() user: AuthUser) {
    const { created } = await this.events.generate(user.id);
    return { created };
  }
}
