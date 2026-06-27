import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { entitlements } from '../common/entitlements';
import { ImportService, UploadedFile } from './import.service';

@UseGuards(JwtAuthGuard)
@Controller('import')
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly prisma: PrismaService,
  ) {}

  /** Upload Spotify Extended Streaming History JSON files. Processing is async. */
  @Post('spotify')
  @UseInterceptors(
    FilesInterceptor('files', 100, { limits: { fileSize: 80 * 1024 * 1024 } }),
  )
  async upload(@CurrentUser() user: AuthUser, @UploadedFiles() files: UploadedFile[]) {
    // Plan gate: importing your full history is a Plus/Pro feature.
    const u = await this.prisma.user.findUnique({ where: { id: user.id }, select: { plan: true, role: true } });
    if (!u || !entitlements(u.plan, u.role).canImport) {
      throw new ForbiddenException('El import de tu historial completo está disponible en Sonora Plus.');
    }
    if (!files || files.length === 0) {
      throw new BadRequestException('No se subió ningún archivo.');
    }
    const entries = this.importService.parseFiles(files);
    if (entries.length === 0) {
      throw new BadRequestException(
        'No se encontraron reproducciones válidas. Sube los archivos "Streaming_History_Audio_*.json" del Extended Streaming History de Spotify.',
      );
    }
    const jobId = await this.importService.enqueue(user.id, entries);
    return { accepted: entries.length, jobId };
  }

  /** Poll the status of an import job (only your own). */
  @Get('status/:jobId')
  status(@CurrentUser() user: AuthUser, @Param('jobId') jobId: string) {
    return this.importService.status(jobId, user.id);
  }
}
