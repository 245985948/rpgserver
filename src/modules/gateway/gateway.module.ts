/**
 * 网关模块
 * 统一处理 WebSocket 连接和消息路由
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MessageGateway } from './message.gateway';
import { TestGateway } from './test.gateway';
import { MessageRouter } from '../../core/message-router';
import { ProtobufModule } from '../../shared/protobuf/protobuf.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    ProtobufModule, // 提供 ProtobufService
    AuthModule, // 提供 AuthService 和配置好的 JwtService
    DatabaseModule, // 提供 Player Model
  ],
  providers: [MessageGateway, TestGateway, MessageRouter],
  exports: [MessageGateway, TestGateway, MessageRouter],
})
export class GatewayModule {}
