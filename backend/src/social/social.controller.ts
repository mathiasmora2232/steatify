import { Controller, Get, Post, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { SocialService } from './social.service';

@Controller('social')
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @UseGuards(JwtAuthGuard)
  @Post('follow/:username')
  follow(@CurrentUser() user: AuthUser, @Param('username') username: string) {
    return this.social.follow(user.id, username);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('follow/:username')
  unfollow(@CurrentUser() user: AuthUser, @Param('username') username: string) {
    return this.social.unfollow(user.id, username);
  }

  @UseGuards(JwtAuthGuard)
  @Get('following')
  following(@CurrentUser() user: AuthUser) {
    return this.social.following(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('feed')
  feed(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.social.feed(user.id, limit ? Math.min(80, parseInt(limit, 10) || 40) : 40);
  }

  /** Follow status for a profile — works logged-out (shows counts only). */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('status/:username')
  status(@CurrentUser() user: AuthUser | null, @Param('username') username: string) {
    return this.social.status(user?.id ?? null, username);
  }
}
