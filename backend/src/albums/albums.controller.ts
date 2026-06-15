import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { AlbumsService } from './albums.service';

@UseGuards(JwtAuthGuard)
@Controller('albums')
export class AlbumsController {
  constructor(private readonly albums: AlbumsService) {}

  @Get(':albumId')
  journey(@CurrentUser() user: AuthUser, @Param('albumId') albumId: string) {
    return this.albums.journey(user.id, albumId);
  }
}
