import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { BrainService } from './brain.service';

@UseGuards(JwtAuthGuard)
@Controller('brain')
export class BrainController {
  constructor(private readonly brain: BrainService) {}

  /** Lo que Steatify detectó: cambios de etapa en música y gaming. */
  @Get()
  detect(@CurrentUser() user: AuthUser) {
    return this.brain.brain(user.id);
  }

  /** Evolución ADN: timeline del arquetipo musical mes a mes (?months=12). */
  @Get('evolution')
  evolution(@CurrentUser() user: AuthUser, @Query('months') months?: string) {
    const n = months ? Math.min(36, Math.max(2, parseInt(months, 10) || 12)) : 12;
    return this.brain.evolution(user.id, n);
  }

  /** Tú vs Tú: compara dos meses (?a=YYYY-MM&b=YYYY-MM). */
  @Get('versus')
  versus(@CurrentUser() user: AuthUser, @Query('a') a: string, @Query('b') b: string) {
    return this.brain.versus(user.id, a, b);
  }
}
