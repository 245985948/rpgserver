/**
 * 自由流派与战斗验证引擎模块
 * 对应PRD 2.3 自由流派与战斗验证引擎
 */

import { Module } from '@nestjs/common';
import { BattleController } from './battle.controller';
import { BattleService } from './battle.service';
import { DungeonService } from './dungeon.service';
import { PartyGateway } from './party.gateway';

@Module({
  controllers: [BattleController],
  providers: [BattleService, DungeonService, PartyGateway],
  exports: [BattleService, DungeonService],
})
export class BattleModule {}
