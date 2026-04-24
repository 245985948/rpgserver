/**
 * 离线收益计算服务
 * 采用统计学期望公式直接计算最终收益
 * 注意: 切忌在玩家上线瞬间遍历计算数万次离线动作
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Player, PlayerDocument } from '../../database/schemas/player.schema';
import { EventManager } from '../../core/event.manager';
import { RedisService } from '../../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_KEYS, OFFLINE_REWARD_MAX_HOURS } from '../../shared/constants';
import { calculateOfflineReward, clampOfflineDuration, now } from '../../shared/utils';
import { ProductionSkill } from '../../shared/enums';

interface IOfflineTask {
  skillType: ProductionSkill;
  startTime: number; // 秒级时间戳
  efficiency: number; // 效率加成(%)
}

@Injectable()
export class OfflineService {
  private readonly logger = new Logger(OfflineService.name);

  constructor(
    @InjectModel(Player.name)
    private playerModel: Model<PlayerDocument>,
    private eventManager: EventManager,
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  /**
   * 设置离线任务
   */
  async setOfflineTask(
    playerId: string,
    dto: { skillType: ProductionSkill; efficiency?: number },
  ): Promise<void> {
    const task: IOfflineTask = {
      skillType: dto.skillType,
      startTime: now(),
      efficiency: dto.efficiency || 0,
    };

    await this.redisService.set(
      `${CACHE_KEYS.PLAYER}${playerId}:offline_task`,
      JSON.stringify(task),
    );

    this.logger.debug(`Player ${playerId} set offline task: ${dto.skillType}`);
  }

  /**
   * 计算并领取离线收益
   * 使用统计学期望公式直接计算,不遍历单次动作
   */
  async calculateAndClaimReward(playerId: string): Promise<{
    rewards: any[];
    expGain: number;
    duration: number; // 实际计算的秒数
    capped: boolean;
  }> {
    // 获取离线任务
    const taskJson = await this.redisService.get(
      `${CACHE_KEYS.PLAYER}${playerId}:offline_task`,
    );

    if (!taskJson) {
      return { rewards: [], expGain: 0, duration: 0, capped: false };
    }

    const task: IOfflineTask = JSON.parse(taskJson);
    const currentTime = now();
    const rawDuration = currentTime - task.startTime;

    // 应用上限限制(防爆号)
    const maxSeconds = OFFLINE_REWARD_MAX_HOURS * 3600;
    const duration = Math.min(rawDuration, maxSeconds);
    const capped = rawDuration > maxSeconds;

    // 使用统计学期望公式计算收益
    // 基础产出速率可以从配置表获取,这里使用简化值
    const baseRate = this.getBaseProductionRate(task.skillType);
    const { totalAmount, effectiveDuration } = calculateOfflineReward(
      baseRate,
      duration,
      task.efficiency,
    );

    // 构建收益结果
    const rewards = this.generateRewards(task.skillType, totalAmount);
    const expGain = this.calculateExpGain(task.skillType, effectiveDuration);

    // 更新玩家数据
    await this.updatePlayerProgress(playerId, task.skillType, rewards, expGain);

    // 清除离线任务(或更新开始时间继续积累)
    await this.redisService.del(`${CACHE_KEYS.PLAYER}${playerId}:offline_task`);

    this.logger.debug(
      `Player ${playerId} claimed offline reward: ${effectiveDuration}s, capped=${capped}`,
    );

    return {
      rewards,
      expGain,
      duration: effectiveDuration,
      capped,
    };
  }

  /**
   * 获取离线收益预览
   */
  async getRewardPreview(playerId: string): Promise<{
    estimatedRewards: any[];
    estimatedExp: number;
    duration: number;
    maxDuration: number;
    willBeCapped: boolean;
  }> {
    const taskJson = await this.redisService.get(
      `${CACHE_KEYS.PLAYER}${playerId}:offline_task`,
    );

    if (!taskJson) {
      return {
        estimatedRewards: [],
        estimatedExp: 0,
        duration: 0,
        maxDuration: OFFLINE_REWARD_MAX_HOURS * 3600,
        willBeCapped: false,
      };
    }

    const task: IOfflineTask = JSON.parse(taskJson);
    const currentTime = now();
    const duration = currentTime - task.startTime;
    const maxDuration = OFFLINE_REWARD_MAX_HOURS * 3600;

    const baseRate = this.getBaseProductionRate(task.skillType);
    const { totalAmount } = calculateOfflineReward(
      baseRate,
      Math.min(duration, maxDuration),
      task.efficiency,
    );

    return {
      estimatedRewards: this.generateRewards(task.skillType, totalAmount),
      estimatedExp: this.calculateExpGain(task.skillType, Math.min(duration, maxDuration)),
      duration,
      maxDuration,
      willBeCapped: duration > maxDuration,
    };
  }

  /**
   * 获取基础产出速率
   * 实际应从配置表读取
   */
  private getBaseProductionRate(skillType: ProductionSkill): number {
    // 简化示例:每秒钟基础产出
    const rates: Record<ProductionSkill, number> = {
      [ProductionSkill.BREATHING]: 0.1, // 吐纳: 0.1灵气/秒
      [ProductionSkill.HERB_GATHERING]: 0.05,
      [ProductionSkill.BAMBOO_CUTTING]: 0.05,
      [ProductionSkill.ARTIFACT_REFINING]: 0.02,
      [ProductionSkill.TALISMAN_MAKING]: 0.02,
      [ProductionSkill.CLOTH_WEAVING]: 0.03,
      [ProductionSkill.SPIRITUAL_FOOD]: 0.03,
      [ProductionSkill.BREWING]: 0.02,
      [ProductionSkill.ALCHEMY]: 0.015,
      [ProductionSkill.NURTURING]: 0.01,
    };
    return rates[skillType] || 0.01;
  }

  /**
   * 生成收益物品
   */
  private generateRewards(skillType: ProductionSkill, amount: number): any[] {
    // 根据技能类型生成对应物品
    // 实际应从配置表读取产出配置
    const itemMap: Record<ProductionSkill, string> = {
      [ProductionSkill.BREATHING]: 'spirit_energy',
      [ProductionSkill.HERB_GATHERING]: 'random_herb',
      [ProductionSkill.BAMBOO_CUTTING]: 'spirit_bamboo',
      [ProductionSkill.ARTIFACT_REFINING]: 'artifact_material',
      [ProductionSkill.TALISMAN_MAKING]: 'talisman_paper',
      [ProductionSkill.CLOTH_WEAVING]: 'spirit_cloth',
      [ProductionSkill.SPIRITUAL_FOOD]: 'spirit_rice',
      [ProductionSkill.BREWING]: 'spirit_wine',
      [ProductionSkill.ALCHEMY]: 'alchemy_material',
      [ProductionSkill.NURTURING]: 'nurture_essence',
    };

    return [
      {
        itemId: itemMap[skillType] || 'unknown',
        count: Math.floor(amount),
      },
    ];
  }

  /**
   * 计算经验获取
   */
  private calculateExpGain(skillType: ProductionSkill, duration: number): number {
    // 每秒经验获取
    return Math.floor(duration * 0.1);
  }

  /**
   * 更新玩家进度
   */
  private async updatePlayerProgress(
    playerId: string,
    skillType: ProductionSkill,
    rewards: any[],
    expGain: number,
  ): Promise<void> {
    // 更新玩家数据
    // 这里简化处理,实际应使用原子操作
    await this.playerModel.findByIdAndUpdate(playerId, {
      $inc: {
        [`productionSkills.$[skill].exp`]: expGain,
        [`productionSkills.$[skill].totalProduced`]: rewards.reduce(
          (sum, r) => sum + r.count,
          0,
        ),
      },
    }, {
      arrayFilters: [{ 'skill.type': skillType }],
    });
  }
}
