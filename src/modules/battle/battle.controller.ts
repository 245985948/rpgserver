/**
 * 战斗控制器
 */

import { Controller, Post, Get, Body, UseGuards, Req, Query } from '@nestjs/common';
import { BattleService } from './battle.service';
import { DungeonService } from './dungeon.service';
import { AuthGuard } from '../../common/guards';
import { DungeonItem } from '../../shared/enums';

@Controller('battle')
@UseGuards(AuthGuard)
export class BattleController {
  constructor(
    private readonly battleService: BattleService,
    private readonly dungeonService: DungeonService,
  ) {}

  /**
   * 切换流派
   */
  @Post('switch-style')
  async switchCombatStyle(@Req() req: any, @Body() dto: any) {
    return this.battleService.switchStyle(req.playerId, dto.style);
  }

  /**
   * 获取当前流派属性
   */
  @Get('style-attributes')
  async getStyleAttributes(@Req() req: any) {
    return this.battleService.getStyleAttributes(req.playerId);
  }

  /**
   * 创建队伍
   */
  @Post('party/create')
  async createParty(@Req() req: any) {
    return this.battleService.createParty(req.playerId);
  }

  /**
   * 加入队伍
   */
  @Post('party/join')
  async joinParty(@Req() req: any, @Body() dto: { partyId: string }) {
    return this.battleService.joinParty(req.playerId, dto.partyId);
  }

  /**
   * 离开队伍
   */
  @Post('party/leave')
  async leaveParty(@Req() req: any) {
    return this.battleService.leaveParty(req.playerId);
  }

  /**
   * 进入九幽幻境
   */
  @Post('dungeon/enter')
  async enterDungeon(@Req() req: any) {
    return this.dungeonService.enterDungeon(req.playerId);
  }

  /**
   * 使用幻境道具
   */
  @Post('dungeon/use-item')
  async useDungeonItem(
    @Req() req: any,
    @Body() dto: { itemType: DungeonItem; target?: any },
  ) {
    return this.dungeonService.useItem(req.playerId, dto.itemType, dto.target);
  }

  /**
   * 获取幻境状态
   */
  @Get('dungeon/status')
  async getDungeonStatus(@Req() req: any) {
    return this.dungeonService.getDungeonState(req.playerId);
  }
}
