import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate-limit by the REAL client IP. The Next.js frontend proxies /api/* to this
 * backend, so req.ip is the proxy — without this, every user would share one
 * rate-limit bucket. We read the left-most X-Forwarded-For entry (the original
 * client) instead, falling back to req.ip.
 */
@Injectable()
export class ProxyThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const xff = (req.headers as Record<string, string | string[]> | undefined)?.['x-forwarded-for'];
    const first = (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0]?.trim();
    return Promise.resolve(first || (req.ip as string) || 'unknown');
  }
}
