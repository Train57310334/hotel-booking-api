import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * @Global() — RedisService is available everywhere without importing RedisModule.
 * Just inject RedisService in any constructor.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
