/**
 * 坊市服务
 * 处理自由交易、天道税回收、价格统计
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Trade, TradeDocument } from '../../database/schemas/trade.schema';
import { RedisService } from '../../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { TRADE_TAX_RATE, CACHE_KEYS } from '../../shared/constants';
import { CurrencyType, TradeType } from '../../shared/enums';
import { calculateTradeTax } from '../../shared/utils';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(
    @InjectModel(Trade.name)
    private tradeModel: Model<TradeDocument>,
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  /**
   * 上架物品
   * 系统收取18%交易税
   */
  async listItem(
    sellerId: string,
    dto: {
      itemId: string;
      itemCount: number;
      price: number;
      currencyType?: CurrencyType;
    },
  ): Promise<{ tradeId: string; estimatedTax: number }> {
    const trade = await this.tradeModel.create({
      sellerId: new Types.ObjectId(sellerId),
      itemId: dto.itemId,
      itemCount: dto.itemCount || 1,
      price: dto.price,
      currencyType: dto.currencyType || CurrencyType.SPIRIT_STONE,
      tax: calculateTradeTax(dto.price),
      tradeType: TradeType.MARKET,
      isCompleted: false,
    });

    // 添加到市场列表缓存
    await this.redisService.zadd(
      `${CACHE_KEYS.MARKET}${dto.itemId}`,
      dto.price,
      trade._id.toString(),
    );

    this.logger.debug(`Item listed: ${dto.itemId} x${dto.itemCount} for ${dto.price}`);

    return {
      tradeId: trade._id.toString(),
      estimatedTax: calculateTradeTax(dto.price),
    };
  }

  /**
   * 购买物品
   * 使用分布式锁确保并发安全
   */
  async buyItem(
    buyerId: string,
    tradeId: string,
  ): Promise<{
    success: boolean;
    itemId: string;
    price: number;
    tax: number;
    sellerReceived: number;
  }> {
    // 分布式锁
    const lockKey = `${CACHE_KEYS.LOCK}trade:${tradeId}`;
    const lockValue = Date.now().toString();
    const acquired = await this.redisService.acquireLock(lockKey, lockValue, 10);

    if (!acquired) {
      throw new BadRequestException('交易处理中,请稍后再试');
    }

    try {
      const trade = await this.tradeModel.findById(tradeId);

      if (!trade) {
        throw new NotFoundException('交易不存在');
      }

      if (trade.isCompleted) {
        throw new BadRequestException('该物品已被购买');
      }

      if (trade.sellerId.toString() === buyerId) {
        throw new BadRequestException('不能购买自己的物品');
      }

      // 执行交易
      trade.buyerId = new Types.ObjectId(buyerId);
      trade.isCompleted = true;
      trade.completedAt = new Date();
      await trade.save();

      // 从市场列表移除
      await this.redisService.zrem(
        `${CACHE_KEYS.MARKET}${trade.itemId}`,
        tradeId,
      );

      const tax = calculateTradeTax(trade.price);
      const sellerReceived = trade.price - tax;

      this.logger.debug(
        `Trade completed: ${tradeId}, buyer: ${buyerId}, tax: ${tax}`,
      );

      return {
        success: true,
        itemId: trade.itemId,
        price: trade.price,
        tax,
        sellerReceived,
      };
    } finally {
      await this.redisService.releaseLock(lockKey, lockValue);
    }
  }

  /**
   * 获取市场列表
   */
  async getListings(
    query: { page: number; pageSize: number; skip: number },
    itemType?: string,
  ): Promise<{
    list: any[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const filter: any = { isCompleted: false, tradeType: TradeType.MARKET };

    if (itemType) {
      // 根据物品类型过滤,需要关联配置表
      filter.itemId = { $regex: `^${itemType}` };
    }

    const [list, total] = await Promise.all([
      this.tradeModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.pageSize)
        .populate('sellerId', 'nickname')
        .lean(),
      this.tradeModel.countDocuments(filter),
    ]);

    return {
      list,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /**
   * 下架物品
   */
  async cancelListing(sellerId: string, tradeId: string): Promise<void> {
    const trade = await this.tradeModel.findOne({
      _id: tradeId,
      sellerId: new Types.ObjectId(sellerId),
      isCompleted: false,
    });

    if (!trade) {
      throw new NotFoundException('交易不存在或已成交');
    }

    // 软删除(标记为完成但不设置buyer)
    trade.isCompleted = true;
    await trade.save();

    // 从市场列表移除
    await this.redisService.zrem(
      `${CACHE_KEYS.MARKET}${trade.itemId}`,
      tradeId,
    );

    this.logger.debug(`Listing cancelled: ${tradeId}`);
  }

  /**
   * 获取市场统计
   */
  async getMarketStats(): Promise<{
    totalActiveListings: number;
    totalVolume24h: number;
    averagePriceByItem: Record<string, number>;
  }> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [activeListings, volume24h] = await Promise.all([
      this.tradeModel.countDocuments({ isCompleted: false }),
      this.tradeModel.aggregate([
        {
          $match: {
            isCompleted: true,
            completedAt: { $gte: twentyFourHoursAgo },
          },
        },
        { $group: { _id: null, total: { $sum: '$price' } } },
      ]),
    ]);

    // 各物品平均价格
    const avgPrices = await this.tradeModel.aggregate([
      { $match: { isCompleted: true } },
      {
        $group: {
          _id: '$itemId',
          avgPrice: { $avg: '$price' },
        },
      },
    ]);

    const averagePriceByItem: Record<string, number> = {};
    for (const item of avgPrices) {
      averagePriceByItem[item._id] = Math.floor(item.avgPrice);
    }

    return {
      totalActiveListings: activeListings,
      totalVolume24h: volume24h[0]?.total || 0,
      averagePriceByItem,
    };
  }

  /**
   * 获取交易历史
   */
  async getTradeHistory(
    playerId: string,
    query: { page: number; pageSize: number; skip: number },
  ): Promise<{
    list: any[];
    total: number;
  }> {
    const filter = {
      $or: [
        { sellerId: new Types.ObjectId(playerId) },
        { buyerId: new Types.ObjectId(playerId) },
      ],
      isCompleted: true,
    };

    const [list, total] = await Promise.all([
      this.tradeModel
        .find(filter)
        .sort({ completedAt: -1 })
        .skip(query.skip)
        .limit(query.pageSize)
        .lean(),
      this.tradeModel.countDocuments(filter),
    ]);

    return { list, total };
  }
}
