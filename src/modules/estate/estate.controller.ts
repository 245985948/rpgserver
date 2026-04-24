/**
 * 仙府控制器
 */

import { Controller, Get, Post, Body, UseGuards, Req, Query } from '@nestjs/common';
import { EstateService } from './estate.service';
import { AuthGuard } from '../../common/guards';
import { BuildingType } from '../../shared/enums';

@Controller('estate')
@UseGuards(AuthGuard)
export class EstateController {
  constructor(private readonly estateService: EstateService) {}

  /**
   * 获取自己的仙府数据
   */
  @Get('my-estate')
  async getMyEstate(@Req() req: any) {
    return this.estateService.getEstate(req.playerId);
  }

  /**
   * 获取其他玩家仙府(用于拜访)
   */
  @Get('visit')
  async visitEstate(@Query('playerId') playerId: string) {
    return this.estateService.getEstateForVisit(playerId);
  }

  /**
   * 建造/升级建筑
   */
  @Post('build')
  async buildBuilding(@Req() req: any, @Body() dto: { buildingType: BuildingType }) {
    return this.estateService.startBuilding(req.playerId, dto.buildingType);
  }

  /**
   * 加速建造
   */
  @Post('boost')
  async boostBuilding(@Req() req: any, @Body() dto: { buildingType: BuildingType }) {
    return this.estateService.boostBuilding(req.playerId, dto.buildingType);
  }

  /**
   * 偷取灵气
   */
  @Post('steal')
  async stealSpirit(@Req() req: any, @Body() dto: { targetPlayerId: string }) {
    return this.estateService.stealSpirit(req.playerId, dto.targetPlayerId);
  }

  /**
   * 协助建造
   */
  @Post('assist')
  async assistBuilding(
    @Req() req: any,
    @Body() dto: { targetPlayerId: string; buildingType: string },
  ) {
    return this.estateService.assistBuilding(
      req.playerId,
      dto.targetPlayerId,
      dto.buildingType,
    );
  }

  /**
   * 获取访客记录
   */
  @Get('visitor-logs')
  async getVisitorLogs(@Req() req: any) {
    return this.estateService.getVisitorLogs(req.playerId);
  }
}
