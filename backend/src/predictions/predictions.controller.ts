import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { PredictionsService } from './predictions.service';

@UseGuards(JwtAuthGuard)
@Controller('predictions')
export class PredictionsController {
  constructor(private readonly predictions: PredictionsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.predictions.listForUser(user.id);
  }

  /** Recompute "rising" candidates on demand. */
  @Post('run')
  run(@CurrentUser() user: AuthUser) {
    return this.predictions.run(user.id);
  }
}
