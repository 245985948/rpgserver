/**
 * 拍卖行服务
 * 处理全服拍卖行的并发竞价
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { CACHE_KEYS } from '../../shared/constants';
import { CurrencyType } from '../../shared/enums';

export interface IAuction {
  id: string;
  sellerId: string;
  itemId: string;
  itemCount: number;
  startPrice: number;
  currentPrice: number;
  currentBidderId?: string;
  currencyType: CurrencyType;
  startTime: number;
  endTime: number;
  bids: Array<{
    bidderId: string;
    amount: number;
    timestamp: number;
  }>;
}

@Injectable()
export class AuctionService {
  private readonly logger = new Logger(AuctionService.name);

  constructor(private redisService: RedisService) {}

  /**
   * 创建拍卖
   */
  async createAuction(
    sellerId: string,
    dto: {
      itemId: string;
      itemCount: number;
      startPrice: number;
      duration: number; // 秒
      currencyType?: CurrencyType;
    },
  ): Promise<{ auctionId: string; endTime: number }> {
    const auctionId = `auction_${Date.now()}_${sellerId.substring(0, 8)}`;
    const now = Date.now();

    const auction: IAuction = {
      id: auctionId,
      sellerId,
      itemId: dto.itemId,
      itemCount: dto.itemCount || 1,
      startPrice: dto.startPrice,
      currentPrice: dto.startPrice,
      currencyType: dto.currencyType || CurrencyType.SPIRIT_STONE,
      startTime: now,
      endTime: now + dto.duration * 1000,
      bids: [],
    };

    // 存入Redis并设置过期
    await this.redisService.setJson(
      `${CACHE_KEYS.AUCTION}${auctionId}`,
      auction,
      dto.duration,
    );

    // 添加到活跃拍卖集合
    await this.redisService.zadd(
      `${CACHE_KEYS.AUCTION}active`,
      auction.endTime,
      auctionId,
    );

    this.logger.debug(`Auction created: ${auctionId} for ${dto.itemId}`);

    return {
      auctionId,
      endTime: auction.endTime,
    };
  }

  /**
   * 出价
   * 使用Redis乐观锁处理并发
   */
  async placeBid(
    bidderId: string,
    auctionId: string,
    amount: number,
  ): Promise<{
    success: boolean;
    currentPrice: number;
    isHighest: boolean;
  }> {
    const cacheKey = `${CACHE_KEYS.AUCTION}${auctionId}`;

    // 使用Redis watch实现乐观锁
    const client = this.redisService.getClient();
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await client.watch(cacheKey);

        const auction = await this.redisService.getJson<IAuction>(cacheKey);

        if (!auction) {
          await client.unwatch();
          throw new NotFoundException('拍卖不存在');
        }

        if (auction.endTime < Date.now()) {
          await client.unwatch();
          throw new BadRequestException('拍卖已结束');
        }

        if (auction.sellerId === bidderId) {
          await client.unwatch();
          throw new BadRequestException('不能竞拍自己的物品');
        }

        if (amount <= auction.currentPrice) {
          await client.unwatch();
          throw new BadRequestException('出价必须高于当前价格');
        }

        // 更新拍卖数据
        auction.currentPrice = amount;
        auction.currentBidderId = bidderId;
        auction.bids.push({
          bidderId,
          amount,
          timestamp: Date.now(),
        });

        // 使用事务保存
        const multi = client.multi();
        multi.set(cacheKey, JSON.stringify(auction));
        const results = await multi.exec();

        if (results) {
          this.logger.debug(`Bid placed: ${amount} on ${auctionId} by ${bidderId}`);
          return {
            success: true,
            currentPrice: amount,
            isHighest: true,
          };
        }
      } catch (err) {
        this.logger.warn(`Bid attempt ${i + 1} failed, retrying...`);
        continue;
      }
    }

    throw new BadRequestException('出价失败,请重试');
  }

  /**
   * 获取活跃拍卖列表
   */
  async getActiveAuctions(query: {
    page: number;
    pageSize: number;
  }): Promise<{
    list: IAuction[];
    total: number;
  }> {
    const now = Date.now();

    // 获取未过期的拍卖ID
    const auctionIds = await this.redisService.zrange(
      `${CACHE_KEYS.AUCTION}active`,
      now,
      Number.POSITIVE_INFINITY,
    );

    // 获取拍卖详情
    const auctions: IAuction[] = [];
    for (const id of auctionIds.slice(
      (query.page - 1) * query.pageSize,
      query.page * query.pageSize,
    )) {
      const auction = await this.redisService.getJson<IAuction>(
        `${CACHE_KEYS.AUCTION}${id}`,
      );
      if (auction) {
        auctions.push(auction);
      }
    }

    return {
      list: auctions,
      total: auctionIds.length,
    };
  }

  /**
   * 获取玩家的拍卖
   */
  async getPlayerAuctions(playerId: string): Promise<{
    selling: IAuction[];
    bidding: IAuction[];
  }> {
    // 获取所有活跃拍卖
    const auctionIds = await this.redisService.zrange(
      `${CACHE_KEYS.AUCTION}active`,
      Date.now(),
      Number.POSITIVE_INFINITY,
    );

    const selling: IAuction[] = [];
    const bidding: IAuction[] = [];

    for (const id of auctionIds) {
      const auction = await this.redisService.getJson<IAuction>(
        `${CACHE_KEYS.AUCTION}${id}`,
      );
      if (auction) {
        if (auction.sellerId === playerId) {
          selling.push(auction);
        } else if (auction.currentBidderId === playerId) {
          bidding.push(auction);
        }
      }
    }

    return { selling, bidding };
  }

  /**
   * 结束拍卖
   */
  async finalizeAuction(auctionId: string): Promise<{
    success: boolean;
    winnerId?: string;
    finalPrice?: number;
  }> {
    const cacheKey = `${CACHE_KEYS.AUCTION}${auctionId}`;
    const auction = await this.redisService.getJson<IAuction>(cacheKey);

    if (!auction) {
      return { success: false };
    }

    // 从活跃集合移除
    await this.redisService.zrem(`${CACHE_KEYS.AUCTION}active`, auctionId);

    // 删除拍卖数据
    await this.redisService.del(cacheKey);

    if (auction.currentBidderId) {
      this.logger.debug(
        `Auction ${auctionId} finalized, winner: ${auction.currentBidderId}, price: ${auction.currentPrice}`,
      );
      return {
        success: true,
        winnerId: auction.currentBidderId,
        finalPrice: auction.currentPrice,
      };
    }

    this.logger.debug(`Auction ${auctionId} ended with no bids`);
    return { success: true };
  }
}
