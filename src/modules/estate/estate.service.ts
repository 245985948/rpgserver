/**
 * 仙府服务
 * 处理14种建筑的建造、增益验证
 * 处理道友拜访、偷灵气、协助加速的并发逻辑
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Estate, EstateDocument } from '../../database/schemas/estate.schema';
import { RedisService } from '../../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_KEYS } from '../../shared/constants';
import { BuildingType } from '../../shared/enums';

interface IBuildingEffect {
  type: string;
  value: number;
}

@Injectable()
export class EstateService {
  private readonly logger = new Logger(EstateService.name);

  constructor(
    @InjectModel(Estate.name)
    private estateModel: Model<EstateDocument>,
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  /**
   * 获取仙府数据
   */
  async getEstate(playerId: string): Promise<any> {
    let estate = await this.estateModel
      .findOne({ playerId: new Types.ObjectId(playerId) })
      .lean();

    if (!estate) {
      // 创建初始仙府
      estate = await this.createInitialEstate(playerId);
    }

    return estate;
  }

  /**
   * 获取他人仙府(拜访用,隐藏敏感信息)
   */
  async getEstateForVisit(playerId: string): Promise<any> {
    const estate = await this.getEstate(playerId);

    // 只返回可访问信息
    return {
      playerId: estate.playerId,
      buildings: estate.buildings.map((b) => ({
        type: b.type,
        level: b.level,
      })),
      spiritGatheringRate: estate.spiritGatheringRate,
    };
  }

  /**
   * 开始建造/升级
   */
  async startBuilding(
    playerId: string,
    buildingType: BuildingType,
  ): Promise<{ success: boolean; estimatedCompleteTime: number }> {
    const estate = await this.getEstate(playerId);

    // 查找建筑
    let building = estate.buildings.find((b) => b.type === buildingType);

    if (building?.isConstructing) {
      throw new BadRequestException('该建筑正在建造中');
    }

    // 获取建造时间
    const buildTime = this.getBuildTime(buildingType, (building?.level || 0) + 1);

    // 使用分布式锁确保并发安全
    const lockKey = `${CACHE_KEYS.LOCK}build:${playerId}:${buildingType}`;
    const lockValue = Date.now().toString();
    const acquired = await this.redisService.acquireLock(lockKey, lockValue, 30);

    if (!acquired) {
      throw new BadRequestException('操作过于频繁,请稍后再试');
    }

    try {
      if (building) {
        // 升级
        await this.estateModel.updateOne(
          { playerId: new Types.ObjectId(playerId), 'buildings.type': buildingType },
          {
            $set: {
              'buildings.$.isConstructing': true,
              'buildings.$.buildProgress': 0,
            },
          },
        );
      } else {
        // 新建
        await this.estateModel.updateOne(
          { playerId: new Types.ObjectId(playerId) },
          {
            $push: {
              buildings: {
                type: buildingType,
                level: 0,
                buildProgress: 0,
                isConstructing: true,
              },
            },
          },
        );
      }

      // 设置建造完成定时任务(简化实现)
      setTimeout(() => {
        this.completeBuilding(playerId, buildingType).catch((err) =>
          this.logger.error(`Complete building failed: ${err.message}`),
        );
      }, buildTime * 1000);

      this.logger.debug(
        `Player ${playerId} started building ${buildingType}, duration: ${buildTime}s`,
      );

      return {
        success: true,
        estimatedCompleteTime: Date.now() + buildTime * 1000,
      };
    } finally {
      await this.redisService.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * 加速建造
   */
  async boostBuilding(playerId: string, buildingType: string): Promise<void> {
    // 使用仙玉或其他货币加速
    this.logger.debug(`Player ${playerId} boosted building ${buildingType}`);
  }

  /**
   * 偷取灵气
   * 使用分布式锁处理并发
   */
  async stealSpirit(
    visitorId: string,
    targetPlayerId: string,
  ): Promise<{ success: boolean; amount: number; cooldown: number }> {
    // 检查冷却时间
    const cooldownKey = `${CACHE_KEYS.ESTATE}steal:${visitorId}:${targetPlayerId}`;
    const lastSteal = await this.redisService.get(cooldownKey);

    if (lastSteal) {
      const cooldownSeconds = this.configService.get<number>('estate.stealCooldown') || 3600;
      const elapsed = (Date.now() - parseInt(lastSteal)) / 1000;
      if (elapsed < cooldownSeconds) {
        return {
          success: false,
          amount: 0,
          cooldown: Math.ceil(cooldownSeconds - elapsed),
        };
      }
    }

    // 使用分布式锁
    const lockKey = `${CACHE_KEYS.LOCK}steal:${targetPlayerId}`;
    const lockValue = Date.now().toString();
    const acquired = await this.redisService.acquireLock(lockKey, lockValue, 10);

    if (!acquired) {
      throw new BadRequestException('操作过于频繁');
    }

    try {
      const targetEstate = await this.getEstate(targetPlayerId);
      const stealAmount = Math.floor(targetEstate.spiritGatheringRate * 100);

      // 记录偷取日志
      await this.estateModel.updateOne(
        { playerId: new Types.ObjectId(targetPlayerId) },
        {
          $push: {
            visitorLogs: {
              visitorId: new Types.ObjectId(visitorId),
              action: 'steal',
              visitTime: new Date(),
            },
          },
        },
      );

      // 设置冷却
      const cooldownSeconds = this.configService.get<number>('estate.stealCooldown') || 3600;
      await this.redisService.set(cooldownKey, Date.now().toString(), cooldownSeconds);

      this.logger.debug(`Player ${visitorId} stole ${stealAmount} spirit from ${targetPlayerId}`);

      return {
        success: true,
        amount: stealAmount,
        cooldown: cooldownSeconds,
      };
    } finally {
      await this.redisService.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * 协助建造
   */
  async assistBuilding(
    visitorId: string,
    targetPlayerId: string,
    buildingType: string,
  ): Promise<{ success: boolean; reducedTime: number }> {
    const targetEstate = await this.getEstate(targetPlayerId);
    const building = targetEstate.buildings.find((b) => b.type === buildingType);

    if (!building?.isConstructing) {
      throw new BadRequestException('该建筑未在建造中');
    }

    // 记录协助日志
    await this.estateModel.updateOne(
      { playerId: new Types.ObjectId(targetPlayerId) },
      {
        $push: {
          visitorLogs: {
            visitorId: new Types.ObjectId(visitorId),
            action: 'assist',
            targetBuilding: buildingType as BuildingType,
            visitTime: new Date(),
          },
        },
      },
    );

    // 计算减少的时间
    const assistBonus = this.configService.get<number>('estate.assistBonus') || 0.2;
    const reducedTime = 300 * assistBonus; // 假设基础300秒

    this.logger.debug(`Player ${visitorId} assisted building for ${targetPlayerId}`);

    return {
      success: true,
      reducedTime,
    };
  }

  /**
   * 获取访客记录
   */
  async getVisitorLogs(playerId: string): Promise<any[]> {
    const estate = await this.estateModel
      .findOne({ playerId: new Types.ObjectId(playerId) })
      .select('visitorLogs')
      .populate('visitorLogs.visitorId', 'nickname')
      .lean();

    return (estate?.visitorLogs || []).slice(-50).reverse(); // 最近50条
  }

  /**
   * 获取建筑效果
   */
  getBuildingEffect(buildingType: BuildingType, level: number): IBuildingEffect {
    const effects: Record<BuildingType, (level: number) => IBuildingEffect> = {
      [BuildingType.SPIRIT_GATHERING]: (l) => ({ type: 'breathing_efficiency', value: l * 5 }),
      [BuildingType.HERB_GARDEN]: (l) => ({ type: 'herb_gathering_efficiency', value: l * 5 }),
      [BuildingType.BAMBOO_FOREST]: (l) => ({ type: 'bamboo_cutting_efficiency', value: l * 5 }),
      [BuildingType.FORGE]: (l) => ({ type: 'artifact_refining_efficiency', value: l * 5 }),
      [BuildingType.TALISMAN_ROOM]: (l) => ({ type: 'talisman_making_efficiency', value: l * 5 }),
      [BuildingType.WEAVING_ROOM]: (l) => ({ type: 'cloth_weaving_efficiency', value: l * 5 }),
      [BuildingType.KITCHEN]: (l) => ({ type: 'spiritual_food_efficiency', value: l * 5 }),
      [BuildingType.WINERY]: (l) => ({ type: 'brewing_efficiency', value: l * 5 }),
      [BuildingType.ALCHEMY_ROOM]: (l) => ({ type: 'alchemy_efficiency', value: l * 5 }),
      [BuildingType.NURTURING_ROOM]: (l) => ({ type: 'nurturing_efficiency', value: l * 5 }),
      [BuildingType.LIBRARY]: (l) => ({ type: 'exp_bonus', value: l * 3 }),
      [BuildingType.MEDITATION_ROOM]: (l) => ({ type: 'realm_progress_bonus', value: l * 3 }),
      [BuildingType.WAREHOUSE]: (l) => ({ type: 'inventory_capacity', value: l * 10 }),
      [BuildingType.SPIRIT_POOL]: (l) => ({ type: 'spirit_gathering_rate', value: l * 10 }),
    };

    return effects[buildingType]?.(level) || { type: 'unknown', value: 0 };
  }

  /**
   * 创建初始仙府
   */
  private async createInitialEstate(playerId: string): Promise<any> {
    const estate = await this.estateModel.create({
      playerId: new Types.ObjectId(playerId),
      buildings: [],
      spiritGatheringRate: 1,
      visitorLogs: [],
    });

    return estate.toObject();
  }

  /**
   * 获取建造时间
   */
  private getBuildTime(buildingType: BuildingType, targetLevel: number): number {
    const baseTime = this.configService.get<number>('estate.baseConstructionTime') || 3600;
    return baseTime * targetLevel;
  }

  /**
   * 完成建造
   */
  private async completeBuilding(playerId: string, buildingType: string): Promise<void> {
    await this.estateModel.updateOne(
      { playerId: new Types.ObjectId(playerId), 'buildings.type': buildingType },
      {
        $set: {
          'buildings.$.isConstructing': false,
          'buildings.$.buildProgress': 100,
        },
        $inc: { 'buildings.$.level': 1 },
      },
    );

    this.logger.debug(`Building ${buildingType} completed for player ${playerId}`);
  }
}
