import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protects routes — requires a valid access token (cookie or Bearer). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
