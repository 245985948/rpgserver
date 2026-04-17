/**
 * 核心模块
 * 提供配置管理、事件系统和全局服务
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configurations } from '../config';
import { EventManager } from './event.manager';
import { ConfigManager } from './config.manager';
import { CrossServiceEventBus } from './cross-service.event-bus';
import { MessageRouter } from './message-router';
import { RedisPubSubService } from '../redis/redis-pubsub.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configurations,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  providers: [EventManager, ConfigManager, CrossServiceEventBus, MessageRouter],
  exports: [EventManager, ConfigManager, CrossServiceEventBus, MessageRouter],
})
export class CoreModule {}
