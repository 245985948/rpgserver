/**
 * 主应用模块
 * 太墟修仙录服务端
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// 核心模块
import { CoreModule } from './core';
import { DatabaseModule } from './database';
import { RedisModule } from './redis';
import { CommonModule } from './common';
import { configurations } from './config';
import { ProtobufModule } from './shared/protobuf/protobuf.module';

// 业务模块
import {
  AuthModule,
  PlayerModule,
  OfflineModule,
  BattleModule,
  EstateModule,
  MarketModule,
} from './modules';
import { GatewayModule } from './modules/gateway/gateway.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      load: configurations,
      envFilePath: ['.env.local', '.env'],
    }),

    // 核心基础设施 (按依赖顺序)
    CoreModule,
    DatabaseModule,    // 先加载数据库
    RedisModule,       // 再加载Redis
    ProtobufModule,    // Protobuf序列化
    CommonModule,      // 最后加载Common(依赖上面两个)

    // 业务模块
    AuthModule,
    PlayerModule,
    OfflineModule,
    BattleModule,
    EstateModule,
    MarketModule,

    // WebSocket 网关
    GatewayModule,
  ],
})
export class AppModule {}
