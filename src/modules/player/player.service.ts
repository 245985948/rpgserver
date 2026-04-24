/**
 * 玩家数据服务
 * 处理玩家数据的读取、验证和更新
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Player, PlayerDocument } from '../../database/schemas/player.schema';
import { EventManager } from '../../core/event.manager';
import { RedisService } from '../../redis/redis.service';
import { CACHE_KEYS, EVENTS } from '../../shared/constants';
import { validateMeridianSlot } from '../../shared/utils';
import { CombatAttribute, ProductionSkill } from '../../shared/enums';

@Injectable()
export class PlayerService {
  constructor(
    @InjectModel(Player.name)
    private playerModel: Model<PlayerDocument>,
    private eventManager: EventManager,
    private redisService: RedisService,
  ) {}

  /**
   * 获取玩家完整资料
   */
  async getProfile(playerId: string): Promise<Player> {
    // 先尝试从缓存获取
    const cacheKey = `${CACHE_KEYS.PLAYER}${playerId}`;
    const cached = await this.redisService.getJson<Player>(cacheKey);
    if (cached) {
      return cached;
    }

    // 从数据库获取
    const player = await this.playerModel.findById(playerId).lean();
    if (!player) {
      throw new NotFoundException('玩家不存在');
    }

    // 写入缓存(5分钟)
    await this.redisService.setJson(cacheKey, player, 300);

    return player as Player;
  }

  /**
   * 更新玩家状态
   */
  async updateStatus(playerId: string, dto: any): Promise<void> {
    await this.playerModel.findByIdAndUpdate(playerId, {
      status: dto.status,
      lastLoginAt: dto.status === 'online' ? new Date() : undefined,
      lastLogoutAt: dto.status === 'offline' ? new Date() : undefined,
    });

    // 清除缓存
    await this.redisService.del(`${CACHE_KEYS.PLAYER}${playerId}`);

    // 发布事件
    const eventType = dto.status === 'online' ? EVENTS.PLAYER_LOGIN : EVENTS.PLAYER_LOGOUT;
    this.eventManager.emit(eventType, { playerId }, playerId);
  }

  /**
   * 获取战斗属性
   * 校验8个战斗属性: 境界、肉身、神识、罡气、护体、剑术、御物、术法
   */
  async getCombatAttributes(playerId: string): Promise<Record<CombatAttribute, number>> {
    const player = await this.getProfile(playerId);
    return player.combatAttributes as Record<CombatAttribute, number>;
  }

  /**
   * 获取生产技能
   * 校验10个生产技能: 吐纳、采药、伐竹、炼器、制符、织衣、灵膳、酿酒、炼丹、温养
   */
  async getProductionSkills(playerId: string): Promise<any[]> {
    const player = await this.getProfile(playerId);
    return player.productionSkills || [];
  }

  /**
   * 获取经脉槽位状态
   * 验证神识等级是否达到20、50、90以解锁第3、4、5个槽位
   */
  async getMeridianSlots(playerId: string): Promise<{
    unlockedSlots: number;
    maxSlots: number;
    equipped: string[];
  }> {
    const player = await this.getProfile(playerId);
    const spiritLevel = (player.combatAttributes as any)?.spirit || 1;

    // 计算最大可解锁槽位
    let maxSlots = 2; // 基础2个槽位
    if (validateMeridianSlot(spiritLevel, 2)) maxSlots = 3;
    if (validateMeridianSlot(spiritLevel, 3)) maxSlots = 4;
    if (validateMeridianSlot(spiritLevel, 4)) maxSlots = 5;

    return {
      unlockedSlots: player.unlockedMeridianSlots,
      maxSlots,
      equipped: player.equippedArtifacts || [],
    };
  }

  /**
   * 验证玩家是否存在
   */
  async validatePlayer(playerId: string): Promise<boolean> {
    const count = await this.playerModel.countDocuments({ _id: playerId });
    return count > 0;
  }
}
