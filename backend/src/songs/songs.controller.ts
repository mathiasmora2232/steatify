import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { SongsService } from './songs.service';

@UseGuards(JwtAuthGuard)
@Controller('songs')
export class SongsController {
  constructor(private readonly songs: SongsService) {}

  @Get(':trackId')
  profile(@CurrentUser() user: AuthUser, @Param('trackId') trackId: string) {
    return this.songs.profile(user.id, trackId);
  }
}
