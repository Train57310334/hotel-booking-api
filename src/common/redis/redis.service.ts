import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Shared Redis client wrapper for the entire NestJS application.
 *
 * Design decisions:
 * - Graceful degradation: if REDIS_URL is not set OR Redis is unreachable,
 *   all operations are silently no-ops (returns null / void). This means the
 *   application works in development without Redis — just without distributed caching.
 * - The caller never needs to check "is Redis available?" before calling get/set/del.
 * - Connection errors are logged but do not crash the process.
 *
 * Usage:
 *   constructor(private redis: RedisService) {}
 *   await this.redis.get('key')          // null if Redis unavailable
 *   await this.redis.set('key', 'val', 300)  // silently ignored if unavailable
 *   await this.redis.del('key')
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL is not set. Running without Redis — JWT user cache will use in-memory fallback. ' +
        'Set REDIS_URL=redis://localhost:6379 to enable distributed caching.'
      );
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        // Never crash the app on Redis failure
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        retryStrategy: (times) => {
          // Exponential backoff, max 30s
          const delay = Math.min(times * 500, 30000);
          this.logger.warn(`Redis reconnect attempt #${times}, retrying in ${delay}ms`);
          return delay;
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('✅ Redis connected');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.error(`Redis error: ${err.message}`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        this.logger.warn('Redis connection closed');
      });

      this.client.connect().catch(err => {
        this.logger.error(`Redis initial connection failed: ${err.message}`);
      });
    } catch (err) {
      this.logger.error(`Failed to initialize Redis client: ${err.message}`);
      this.client = null;
    }
  }

  /**
   * Get a value from Redis. Returns null if key not found or Redis is unavailable.
   */
  async get(key: string): Promise<string | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      return await this.client.get(key);
    } catch (err) {
      this.logger.error(`Redis GET error for key "${key}": ${err.message}`);
      return null;
    }
  }

  /**
   * Set a value in Redis with optional TTL in seconds.
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      this.logger.error(`Redis SET error for key "${key}": ${err.message}`);
    }
  }

  /**
   * Delete one or more keys.
   */
  async del(...keys: string[]): Promise<void> {
    if (!this.client || !this.isConnected || keys.length === 0) return;
    try {
      await this.client.del(...keys);
    } catch (err) {
      this.logger.error(`Redis DEL error for keys "${keys.join(', ')}": ${err.message}`);
    }
  }

  /**
   * Check if Redis is currently available.
   */
  get available(): boolean {
    return this.isConnected;
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
  }
}
