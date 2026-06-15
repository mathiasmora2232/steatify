import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { ArtistsService } from './artists.service';

@UseGuards(JwtAuthGuard)
@Controller('artists')
export class ArtistsController {
  constructor(private readonly artists: ArtistsService) {}

  @Get(':artistId')
  profile(@CurrentUser() user: AuthUser, @Param('artistId') artistId: string) {
    return this.artists.profile(user.id, artistId);
  }
}
