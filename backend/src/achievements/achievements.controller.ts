import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { AchievementsService } from './achievements.service';

@UseGuards(JwtAuthGuard)
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievements: AchievementsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.achievements.listForUser(user.id);
  }

  /** Force a re-evaluation (normally runs after each sync). */
  @Post('evaluate')
  evaluate(@CurrentUser() user: AuthUser) {
    return this.achievements.evaluate(user.id);
  }
}
