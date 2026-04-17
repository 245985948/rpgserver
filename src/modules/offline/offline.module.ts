/**
 * 离线收益计算中心模块
 * 对应PRD 2.2 离线收益计算中心
 */

import { Module } from '@nestjs/common';
import { OfflineController } from './offline.controller';
import { OfflineService } from './offline.service';

@Module({
  controllers: [OfflineController],
  providers: [OfflineService],
  exports: [OfflineService],
})
export class OfflineModule {}
