/**
 * Redis模块
 * 提供Redis连接和缓存服务
 */

import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { RedisPubSubService } from './redis-pubsub.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const client = new Redis({
          host: configService.get('redis.host', 'localhost'),
          port: configService.get('redis.port', 6379),
          password: configService.get('redis.password', undefined),
          db: configService.get('redis.db', 0),
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          retryStrategy: (times: number) => {
            return Math.min(times * 50, 2000);
          },
        });

        client.on('connect', () => {
          console.log('Redis connected successfully');
        });

        client.on('error', (err) => {
          console.error('Redis connection error:', err);
        });

        return client;
      },
      inject: [ConfigService],
    },
    {
      provide: RedisService,
      useFactory: (client: Redis) => new RedisService(client),
      inject: ['REDIS_CLIENT'],
    },
    {
      provide: RedisPubSubService,
      useFactory: (client: Redis) => new RedisPubSubService(client),
      inject: ['REDIS_CLIENT'],
    },
  ],
  exports: [RedisService, RedisPubSubService],
})
export class RedisModule {}
