import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ConflictException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { thumbnailDataUri, processImageDataUri } from '../common/images.util';

class UpdateSettingsDto {
  @IsBoolean()
  syncEnabled!: boolean;
}

class TimezoneDto {
  @IsInt()
  @Min(-840)
  @Max(840)
  offsetMinutes!: number;
}

class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(50) displayName?: string;
  @IsOptional() @IsString() @MaxLength(20) username?: string;
  @IsOptional() @IsString() @MaxLength(280) bio?: string;
  @IsOptional() @IsString() @MaxLength(500) avatarUrl?: string;
  @IsOptional() @IsString() @MaxLength(500) bannerUrl?: string;
  @IsOptional() @IsString() @MaxLength(80) location?: string;
  @IsOptional() @IsString() @MaxLength(120) website?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @IsBoolean() showSteam?: boolean;
  @IsOptional() @IsBoolean() showMusic?: boolean;
  @IsOptional() @IsBoolean() aiAuto?: boolean;
}

const PROFILE_SELECT = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bannerUrl: true,
  bio: true,
  location: true,
  website: true,
  isPublic: true,
  showSteam: true,
  showMusic: true,
  aiAuto: true,
  country: true,
  product: true,
  createdAt: true,
  lastSyncedAt: true,
  syncEnabled: true,
  tzOffset: true,
  spotifyId: true,
} as const;

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const u = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: PROFILE_SELECT,
    });
    return { ...u, hasPassword: undefined, isGuest: u?.spotifyId === 'guest' && !u?.username };
  }

  /** Edit the Sonora profile. */
  @Patch('me')
  async updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    if (dto.username) {
      const username = dto.username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        throw new ConflictException('Usuario inválido (3-20: a-z, 0-9, _).');
      }
      const taken = await this.prisma.user.findFirst({
        where: { username, NOT: { id: user.id } },
        select: { id: true },
      });
      if (taken) throw new ConflictException('Ese usuario ya existe.');
      dto.username = username;
    }
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: dto.displayName,
        username: dto.username,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
        bannerUrl: dto.bannerUrl,
        location: dto.location,
        website: dto.website,
        isPublic: dto.isPublic,
        showSteam: dto.showSteam,
        showMusic: dto.showMusic,
        aiAuto: dto.aiAuto,
      },
      select: PROFILE_SELECT,
    });
  }

  /**
   * Avatar upload — processes ANY image (incl. iPhone HEIC) into a normalized
   * 256px square JPEG via @librerias/images (sharp), stored as a data URI. No
   * external storage needed, and EXIF orientation is fixed.
   */
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: 8 * 1024 * 1024 } }))
  async avatar(@CurrentUser() user: AuthUser, @UploadedFile() file?: { buffer?: Buffer }) {
    if (!file?.buffer?.length) throw new BadRequestException('No se recibió ninguna imagen.');
    let dataUri: string;
    try {
      dataUri = await thumbnailDataUri(file.buffer, 256, 82);
    } catch {
      throw new BadRequestException('No se pudo procesar la imagen. ¿Es un archivo válido?');
    }
    return this.prisma.user.update({ where: { id: user.id }, data: { avatarUrl: dataUri }, select: PROFILE_SELECT });
  }

  /** Banner upload — normalized to ≤1280px JPEG via @librerias/images, stored as data URI. */
  @Post('me/banner')
  @UseInterceptors(FileInterceptor('banner', { limits: { fileSize: 12 * 1024 * 1024 } }))
  async banner(@CurrentUser() user: AuthUser, @UploadedFile() file?: { buffer?: Buffer }) {
    if (!file?.buffer?.length) throw new BadRequestException('No se recibió ninguna imagen.');
    let dataUri: string;
    try {
      dataUri = await processImageDataUri(file.buffer, { maxDim: 1280, quality: 78 });
    } catch {
      throw new BadRequestException('No se pudo procesar la imagen.');
    }
    return this.prisma.user.update({ where: { id: user.id }, data: { bannerUrl: dataUri }, select: PROFILE_SELECT });
  }

  /** Borrar cuenta — elimina al usuario y, por cascada, todo lo asociado. */
  @Delete('me')
  async deleteAccount(@CurrentUser() user: AuthUser) {
    await this.prisma.user.delete({ where: { id: user.id } });
    return { deleted: true };
  }

  /** Export everything we store for this user as JSON (privacy / portability). */
  @Get('me/export')
  async export(@CurrentUser() user: AuthUser) {
    const [profile, plays, eras, achievements] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: user.id }, select: PROFILE_SELECT }),
      this.prisma.listeningHistory.count({ where: { userId: user.id } }),
      this.prisma.musicEra.count({ where: { userId: user.id } }),
      this.prisma.userAchievement.count({ where: { userId: user.id, unlockedAt: { not: null } } }),
    ]);
    return { exportedAt: new Date().toISOString(), profile, totals: { plays, eras, achievementsUnlocked: achievements } };
  }

  @Patch('me/settings')
  updateSettings(@CurrentUser() user: AuthUser, @Body() dto: UpdateSettingsDto) {
    return this.prisma.user.update({
      where: { id: user.id },
      data: { syncEnabled: dto.syncEnabled },
      select: { id: true, syncEnabled: true },
    });
  }

  @Put('me/timezone')
  async timezone(@CurrentUser() user: AuthUser, @Body() dto: TimezoneDto) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { tzOffset: dto.offsetMinutes },
      select: { id: true },
    });
    return { ok: true };
  }
}
