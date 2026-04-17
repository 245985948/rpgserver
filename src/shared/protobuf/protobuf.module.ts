/**
 * Protobuf 模块
 * 提供 Protobuf 序列化服务
 */

import { Module, Global } from '@nestjs/common';
import { ProtobufService } from './protobuf.service';

@Global()
@Module({
  providers: [ProtobufService],
  exports: [ProtobufService],
})
export class ProtobufModule {}
