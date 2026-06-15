import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { DnaService } from './dna.service';

@UseGuards(JwtAuthGuard)
@Controller('dna')
export class DnaController {
  constructor(private readonly dna: DnaService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.dna.compute(user.id);
  }
}
