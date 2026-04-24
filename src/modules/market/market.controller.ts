/**
 * 坊市控制器
 * 演示重构后的功能使用：
 * - JWT 认证 (JwtAuthGuard)
 * - 跨服务事件通知 (EventManager)
 * - Protobuf 响应支持
 */

import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  Query,
  Req,
} from '@nestjs/common';
import { MarketService } from './market.service';
import { AuctionService } from './auction.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentPlayerId } from '../../common/decorators/current-user.decorator';
import { ProtobufInterceptor } from '../../common/interceptors';
import { EventManager } from '../../core/event.manager';
import { PaginationPipe } from '../../common/pipes';

// 购买请求 DTO
interface IBuyItemDto {
  itemId: string;
  quantity: number;
}

@Controller('market')
@UseGuards(JwtAuthGuard)  // JWT 认证守卫
@UseInterceptors(ProtobufInterceptor)  // Protobuf 序列化支持
export class MarketController {
  constructor(
    private readonly marketService: MarketService,
    private readonly auctionService: AuctionService,
    private readonly eventManager: EventManager,
  ) {}

  // ========== 自由交易 ==========

  /**
   * 上架物品
   */
  @Post('sell')
  async listItem(
    @CurrentPlayerId() playerId: string,  // 从 JWT 获取玩家ID
    @Body() dto: any,
  ) {
    return this.marketService.listItem(playerId, dto);
  }

  /**
   * 购买物品
   * 演示：购买后触发跨服务事件通知
   */
  @Post('buy')
  async buyItem(
    @CurrentPlayerId() playerId: string,  // 从 JWT 获取玩家ID
    @Body() dto: { tradeId: string },
  ) {
    // 执行购买逻辑
    const result = await this.marketService.buyItem(playerId, dto.tradeId);

    // TODO: 从 result 中获取实际的数据，这里简化演示
    // ===== 关键：通知跨服务事件 =====
    // WebSocket 服务会收到通知，实时推送给玩家
    // 注意：实际使用时需要从数据库获取变更前后的值
    // await this.eventManager.notifyPlayerAttrChanged(...)

    return result;
  }

  /**
   * 获取市场列表
   * 支持 Protobuf 格式 (客户端添加 Accept: application/x-protobuf)
   */
  @Get('listings')
  async getListings(
    @Query(new PaginationPipe()) query: any,
    @Query('itemType') itemType?: string,
  ) {
    return this.marketService.getListings(query, itemType);
  }

  /**
   * 下架物品
   */
  @Post('cancel')
  async cancelListing(
    @CurrentPlayerId() playerId: string,
    @Body() dto: { tradeId: string },
  ) {
    return this.marketService.cancelListing(playerId, dto.tradeId);
  }

  // ========== 拍卖行 ==========

  /**
   * 创建拍卖
   */
  @Post('auction/create')
  async createAuction(
    @CurrentPlayerId() playerId: string,
    @Body() dto: any,
  ) {
    return this.auctionService.createAuction(playerId, dto);
  }

  /**
   * 出价
   */
  @Post('auction/bid')
  async placeBid(
    @CurrentPlayerId() playerId: string,
    @Body() dto: { auctionId: string; amount: number },
  ) {
    return this.auctionService.placeBid(playerId, dto.auctionId, dto.amount);
  }

  /**
   * 获取拍卖列表
   */
  @Get('auction/list')
  async getAuctions(@Query(new PaginationPipe()) query: any) {
    return this.auctionService.getActiveAuctions(query);
  }

  /**
   * 获取我的拍卖
   */
  @Get('auction/my')
  async getMyAuctions(@CurrentPlayerId() playerId: string) {
    return this.auctionService.getPlayerAuctions(playerId);
  }

  // ========== 经济统计 ==========

  /**
   * 获取市场统计
   */
  @Get('stats')
  async getMarketStats() {
    return this.marketService.getMarketStats();
  }

  /**
   * 获取交易历史
   */
  @Get('history')
  async getTradeHistory(
    @CurrentPlayerId() playerId: string,
    @Query(new PaginationPipe()) query: any,
  ) {
    return this.marketService.getTradeHistory(playerId, query);
  }
}
