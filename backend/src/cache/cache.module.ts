import { Global, Module } from '@nestjs/common';
import { RedisCacheService } from './redis-cache.service';

/** Global so any service can inject RedisCacheService without re-importing. */
@Global()
@Module({
  providers: [RedisCacheService],
  exports: [RedisCacheService],
})
export class CacheModule {}
