import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { AdminService } from './admin.service';

class SuspendDto {
  @IsBoolean() suspended!: boolean;
}

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  /** Per-user system status (own debug). */
  @Get('overview')
  overview(@CurrentUser() user: AuthUser) {
    return this.admin.overview(user.id);
  }

  /** Product-wide metrics — admins only. */
  @Get('metrics')
  metrics(@CurrentUser() user: AuthUser) {
    return this.admin.metrics(user.id);
  }

  /** Recent users — admins only. */
  @Get('users')
  users(@CurrentUser() user: AuthUser, @Query('take') take?: string) {
    return this.admin.users(user.id, take ? parseInt(take, 10) || 60 : 60);
  }

  @Post('users/:id/suspend')
  suspend(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SuspendDto) {
    return this.admin.setSuspended(user.id, id, dto.suspended);
  }
}
