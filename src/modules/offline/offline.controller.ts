/**
 * 离线收益控制器
 */

import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { OfflineService } from './offline.service';
import { AuthGuard } from '../../common/guards';

@Controller('offline')
@UseGuards(AuthGuard)
export class OfflineController {
  constructor(private readonly offlineService: OfflineService) {}

  /**
   * 设置离线任务
   */
  @Post('set-task')
  async setOfflineTask(@Req() req: any, @Body() dto: any) {
    return this.offlineService.setOfflineTask(req.playerId, dto);
  }

  /**
   * 计算并领取离线收益
   */
  @Post('claim')
  async claimOfflineReward(@Req() req: any) {
    return this.offlineService.calculateAndClaimReward(req.playerId);
  }

  /**
   * 获取离线收益预览
   */
  @Get('preview')
  async getOfflinePreview(@Req() req: any) {
    return this.offlineService.getRewardPreview(req.playerId);
  }
}
