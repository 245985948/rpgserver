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

@Module({
  imports: [
    JwtModule, // 提供 JwtService 给 JwtAuthGuard
    ProtobufModule, // 提供 ProtobufService
  ],
  providers: [MessageGateway, TestGateway, MessageRouter],
  exports: [MessageGateway, TestGateway, MessageRouter],
})
export class GatewayModule {}
