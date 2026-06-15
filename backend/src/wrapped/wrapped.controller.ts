import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { WrappedService } from './wrapped.service';

@UseGuards(JwtAuthGuard)
@Controller('wrapped')
export class WrappedController {
  constructor(private readonly wrapped: WrappedService) {}

  /** ?period=month|year|all */
  @Get()
  get(@CurrentUser() user: AuthUser, @Query('period') period = 'month') {
    return this.wrapped.generate(user.id, period);
  }
}
