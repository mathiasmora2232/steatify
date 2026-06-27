import { Body, Controller, Post } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

class JoinDto {
  @IsEmail() email!: string;
  @IsOptional() @IsString() @MaxLength(40) source?: string;
}

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly prisma: PrismaService) {}

  /** Public email capture — deduped, rate-limited. */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  async join(@Body() dto: JoinDto) {
    const email = dto.email.trim().toLowerCase();
    await this.prisma.waitlistEntry.upsert({
      where: { email },
      create: { email, source: dto.source?.slice(0, 40) },
      update: {},
    });
    return { ok: true };
  }
}
