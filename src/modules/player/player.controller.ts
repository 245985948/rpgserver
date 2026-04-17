/**
 * 玩家数据控制器
 * 处理玩家相关HTTP请求
 */

import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { PlayerService } from './player.service';
import { AuthGuard } from '../../common/guards';

@Controller('player')
@UseGuards(AuthGuard)
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  /**
   * 获取玩家完整数据
   */
  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.playerService.getProfile(req.playerId);
  }

  /**
   * 更新玩家状态
   */
  @Post('status')
  async updateStatus(@Req() req: any, @Body() dto: any) {
    return this.playerService.updateStatus(req.playerId, dto);
  }

  /**
   * 获取战斗属性
   */
  @Get('combat-attributes')
  async getCombatAttributes(@Req() req: any) {
    return this.playerService.getCombatAttributes(req.playerId);
  }

  /**
   * 获取生产技能
   */
  @Get('production-skills')
  async getProductionSkills(@Req() req: any) {
    return this.playerService.getProductionSkills(req.playerId);
  }

  /**
   * 获取经脉槽位状态
   */
  @Get('meridian-slots')
  async getMeridianSlots(@Req() req: any) {
    return this.playerService.getMeridianSlots(req.playerId);
  }
}
