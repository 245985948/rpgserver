/**
 * 扩展示例服务
 * 展示标准的业务服务结构
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventManager } from '../../core/event.manager';
import { RedisService } from '../../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_KEYS, EVENTS } from '../../shared/constants';

@Injectable()
export class ExampleService {
  private readonly logger = new Logger(ExampleService.name);

  constructor(
    // 注入数据库模型(如需新建集合,先在 database/schemas/ 中定义Schema)
    // @InjectModel(SomeModel.name)
    // private someModel: Model<SomeModelDocument>,

    // 注入核心服务
    private eventManager: EventManager,
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  /**
   * 创建
   */
  async create(playerId: string, dto: any): Promise<any> {
    this.logger.debug(`Player ${playerId} creating example`);

    // 1. 业务逻辑处理
    // const entity = await this.someModel.create({ ...dto, playerId });

    // 2. 发布事件
    this.eventManager.emit(EVENTS.EXAMPLE_EVENT, { playerId, data: dto }, playerId);

    // 3. 清除相关缓存
    await this.redisService.del(`${CACHE_KEYS.PLAYER}${playerId}:examples`);

    return { id: 'example_id', ...dto };
  }

  /**
   * 查询列表
   */
  async findAll(
    playerId: string,
    query: { page: number; pageSize: number; skip: number },
  ): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const cacheKey = `${CACHE_KEYS.PLAYER}${playerId}:examples`;

    // 尝试从缓存获取
    const cached = await this.redisService.getJson<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // 从数据库查询
    // const [list, total] = await Promise.all([
    //   this.someModel.find({ playerId }).skip(query.skip).limit(query.pageSize).lean(),
    //   this.someModel.countDocuments({ playerId }),
    // ]);

    const result = {
      list: [],
      total: 0,
      page: query.page,
      pageSize: query.pageSize,
    };

    // 写入缓存(5分钟)
    await this.redisService.setJson(cacheKey, result, 300);

    return result;
  }

  /**
   * 查询单个
   */
  async findOne(id: string): Promise<any> {
    // const entity = await this.someModel.findById(id).lean();
    // if (!entity) {
    //   throw new NotFoundException('记录不存在');
    // }
    return { id };
  }

  /**
   * 更新
   */
  async update(playerId: string, id: string, dto: any): Promise<any> {
    // 1. 验证所有权
    // const entity = await this.someModel.findOne({ _id: id, playerId });
    // if (!entity) {
    //   throw new NotFoundException('记录不存在或无权限');
    // }

    // 2. 执行更新
    // await this.someModel.findByIdAndUpdate(id, dto);

    // 3. 清除缓存
    await this.redisService.del(`${CACHE_KEYS.PLAYER}${playerId}:examples`);

    this.logger.debug(`Player ${playerId} updated example ${id}`);

    return { success: true };
  }

  /**
   * 删除
   */
  async remove(playerId: string, id: string): Promise<void> {
    // 1. 验证所有权
    // const entity = await this.someModel.findOne({ _id: id, playerId });
    // if (!entity) {
    //   throw new NotFoundException('记录不存在或无权限');
    // }

    // 2. 执行删除
    // await this.someModel.findByIdAndDelete(id);

    // 3. 清除缓存
    await this.redisService.del(`${CACHE_KEYS.PLAYER}${playerId}:examples`);

    this.logger.debug(`Player ${playerId} deleted example ${id}`);
  }

  /**
   * 使用分布式锁的示例
   */
  async lockedOperation(playerId: string): Promise<any> {
    const lockKey = `${CACHE_KEYS.LOCK}example:${playerId}`;
    const lockValue = Date.now().toString();

    // 获取锁
    const acquired = await this.redisService.acquireLock(lockKey, lockValue, 30);
    if (!acquired) {
      throw new ForbiddenException('操作过于频繁,请稍后再试');
    }

    try {
      // 执行业务逻辑
      this.logger.debug(`Locked operation executed for ${playerId}`);
      return { success: true };
    } finally {
      // 释放锁
      await this.redisService.releaseLock(lockKey, lockValue);
    }
  }
}
