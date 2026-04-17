/**
 * 九幽幻境服务
 * 处理九幽幻境玩法逻辑
 * 验证引路符(上限100张)与隐匿阵(上限4个)的消耗与逻辑状态
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { CACHE_KEYS, DUNGEON_ITEM_LIMITS } from '../../shared/constants';
import { DungeonItem } from '../../shared/enums';

export interface IDungeonState {
  playerId: string;
  currentFloor: number;
  maxFloor: number;
  items: Record<DungeonItem, number>;
  activeArrays: number;
  isActive: boolean;
  enteredAt: number;
}

@Injectable()
export class DungeonService {
  private readonly logger = new Logger(DungeonService.name);

  constructor(private redisService: RedisService) {}

  /**
   * 进入九幽幻境
   */
  async enterDungeon(playerId: string): Promise<{
    state: IDungeonState;
    message: string;
  }> {
    const cacheKey = `${CACHE_KEYS.DUNGEON}${playerId}`;

    // 检查是否已在幻境中
    const existing = await this.redisService.getJson<IDungeonState>(cacheKey);
    if (existing?.isActive) {
      return { state: existing, message: '继续探索九幽幻境' };
    }

    // 初始化新状态
    const state: IDungeonState = {
      playerId,
      currentFloor: 1,
      maxFloor: existing?.maxFloor || 0,
      items: {
        [DungeonItem.GUIDING_TALISMAN]: 10, // 初始赠送10张
        [DungeonItem.CONCEALMENT_ARRAY]: 2, // 初始赠送2个
      },
      activeArrays: 0,
      isActive: true,
      enteredAt: Date.now(),
    };

    await this.redisService.setJson(cacheKey, state, 3600); // 1小时过期

    this.logger.debug(`Player ${playerId} entered dungeon at floor 1`);

    return {
      state,
      message: '进入九幽幻境,当前位于第1层',
    };
  }

  /**
   * 使用幻境道具
   */
  async useItem(
    playerId: string,
    itemType: DungeonItem,
    target?: any,
  ): Promise<{
    success: boolean;
    remaining: number;
    effect: string;
  }> {
    const cacheKey = `${CACHE_KEYS.DUNGEON}${playerId}`;
    const state = await this.redisService.getJson<IDungeonState>(cacheKey);

    if (!state?.isActive) {
      throw new BadRequestException('未在九幽幻境中');
    }

    // 检查道具数量
    if (state.items[itemType] <= 0) {
      throw new BadRequestException(`${itemType} 数量不足`);
    }

    // 消耗道具
    state.items[itemType]--;

    // 应用道具效果
    let effect = '';
    switch (itemType) {
      case DungeonItem.GUIDING_TALISMAN:
        // 引路符: 直接进入下一层
        state.currentFloor++;
        effect = `使用引路符,进入第${state.currentFloor}层`;
        break;

      case DungeonItem.CONCEALMENT_ARRAY:
        // 隐匿阵: 增加隐匿状态
        if (state.activeArrays >= DUNGEON_ITEM_LIMITS.CONCEALMENT_ARRAY) {
          throw new BadRequestException('隐匿阵已达上限(4个)');
        }
        state.activeArrays++;
        effect = `使用隐匿阵,当前隐匿层数: ${state.activeArrays}`;
        break;
    }

    // 更新状态
    await this.redisService.setJson(cacheKey, state, 3600);

    this.logger.debug(`Player ${playerId} used ${itemType}, remaining: ${state.items[itemType]}`);

    return {
      success: true,
      remaining: state.items[itemType],
      effect,
    };
  }

  /**
   * 获取幻境状态
   */
  async getDungeonState(playerId: string): Promise<IDungeonState | null> {
    const cacheKey = `${CACHE_KEYS.DUNGEON}${playerId}`;
    return this.redisService.getJson<IDungeonState>(cacheKey);
  }

  /**
   * 退出幻境
   */
  async exitDungeon(playerId: string): Promise<{
    currentFloor: number;
    maxFloor: number;
    rewards: any[];
  }> {
    const cacheKey = `${CACHE_KEYS.DUNGEON}${playerId}`;
    const state = await this.redisService.getJson<IDungeonState>(cacheKey);

    if (!state) {
      throw new BadRequestException('未在九幽幻境中');
    }

    // 更新最高层数
    if (state.currentFloor > state.maxFloor) {
      state.maxFloor = state.currentFloor;
    }

    state.isActive = false;

    // 保存历史记录(保留maxFloor)
    await this.redisService.setJson(cacheKey, state, 86400); // 保留24小时

    // 计算奖励
    const rewards = this.calculateRewards(state.currentFloor);

    this.logger.debug(`Player ${playerId} exited dungeon at floor ${state.currentFloor}`);

    return {
      currentFloor: state.currentFloor,
      maxFloor: state.maxFloor,
      rewards,
    };
  }

  /**
   * 获取道具
   */
  async acquireItem(
    playerId: string,
    itemType: DungeonItem,
    count: number,
  ): Promise<{ current: number; max: number; overflow: boolean }> {
    const cacheKey = `${CACHE_KEYS.DUNGEON}${playerId}`;
    const state = await this.redisService.getJson<IDungeonState>(cacheKey);

    if (!state) {
      throw new BadRequestException('未在九幽幻境中');
    }

    const maxLimit = DUNGEON_ITEM_LIMITS[itemType];
    const newCount = state.items[itemType] + count;
    const overflow = newCount > maxLimit;

    state.items[itemType] = Math.min(newCount, maxLimit);

    await this.redisService.setJson(cacheKey, state, 3600);

    return {
      current: state.items[itemType],
      max: maxLimit,
      overflow,
    };
  }

  /**
   * 计算奖励
   */
  private calculateRewards(floor: number): any[] {
    // 简化实现
    return [
      { itemId: 'dungeon_spirit_stone', count: floor * 10 },
      { itemId: 'cultivation_material', count: Math.floor(floor / 10) + 1 },
    ];
  }
}
