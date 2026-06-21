import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Like JwtAuthGuard but never rejects: if there's no valid token the request
 * still proceeds with a null user. For routes that personalize when logged in
 * but are also usable logged out (e.g. public follow status).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<T = unknown>(_err: unknown, user: T): T | null {
    return user ?? null;
  }
}
