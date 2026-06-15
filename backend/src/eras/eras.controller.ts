import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { ErasService } from './eras.service';

@UseGuards(JwtAuthGuard)
@Controller('eras')
export class ErasController {
  constructor(private readonly eras: ErasService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.eras.listForUser(user.id);
  }

  /** Short emotional AI narrative for one era. */
  @Get(':id/narrative')
  narrative(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.eras.narrative(user.id, id);
  }

  /** Recompute the user's eras from their full history. */
  @Post('rebuild')
  rebuild(@CurrentUser() user: AuthUser) {
    return this.eras.rebuild(user.id);
  }
}
