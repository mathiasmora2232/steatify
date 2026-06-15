import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Thin JSON cache over Redis (the same instance BullMQ uses). Every operation is
 * best-effort: a Redis hiccup logs a warning and degrades to "cache miss" so the
 * caller just recomputes — caching must never break a request.
 */
@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly redis: Redis;

  constructor() {
    this.redis = process.env.REDIS_URL
      ? new Redis(process.env.REDIS_URL)
      : new Redis({
          host: process.env.REDIS_HOST ?? 'localhost',
          port: Number(process.env.REDIS_PORT ?? 6379),
        });
    this.redis.on('error', (e) => this.logger.warn(`Redis error: ${e.message}`));
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (e) {
      this.logger.warn(`get ${key} failed: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (e) {
      this.logger.warn(`set ${key} failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  /** Delete keys matching a glob pattern (e.g. `wrapped:v1:user:*`). */
  async delByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length) await this.redis.del(keys);
    } catch (e) {
      this.logger.warn(`del ${pattern} failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  /** Mark a user as "active right now" (sliding 2h window). Best-effort. */
  async markSeen(userId: string, ttlSeconds = 7200): Promise<void> {
    try {
      await this.redis.set(`seen:${userId}`, '1', 'EX', ttlSeconds);
    } catch {
      /* ignore — activity tracking must never break a request */
    }
  }

  /** Of the given user ids, return only those active within the seen window. */
  async filterActive(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    try {
      const pipe = this.redis.pipeline();
      userIds.forEach((id) => pipe.exists(`seen:${id}`));
      const res = await pipe.exec();
      return userIds.filter((_, i) => res?.[i]?.[1] === 1);
    } catch (e) {
      this.logger.warn(`filterActive failed: ${e instanceof Error ? e.message : e}`);
      return userIds; // on Redis trouble, don't starve syncs — fall back to all
    }
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }
}
