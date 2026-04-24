/**
 * 玩家数据与状态聚合模块
 * 对应PRD 2.1 玩家数据与状态聚合模块
 */

import { Module } from '@nestjs/common';
import { PlayerController } from './player.controller';
import { PlayerService } from './player.service';

@Module({
  controllers: [PlayerController],
  providers: [PlayerService],
  exports: [PlayerService],
})
export class PlayerModule {}
