import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { ChartsService } from './charts.service';

@UseGuards(JwtAuthGuard)
@Controller('charts')
export class ChartsController {
  constructor(private readonly charts: ChartsService) {}

  @Get('records')
  records(@CurrentUser() user: AuthUser) {
    return this.charts.records(user.id);
  }

  @Get('albums')
  albums(@CurrentUser() user: AuthUser) {
    return this.charts.albums(user.id);
  }
}
