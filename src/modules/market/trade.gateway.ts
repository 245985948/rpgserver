/**
 * 交易WebSocket网关
 * 处理实时交易通知
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@WebSocketGateway({
  namespace: 'trade',
  cors: {
    origin: '*',
  },
})
export class TradeGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TradeGateway.name);

  constructor(private redisService: RedisService) {}

  /**
   * 订阅市场更新
   */
  @SubscribeMessage('subscribe-market')
  async handleSubscribeMarket(
    @MessageBody() data: { itemTypes?: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const rooms = data.itemTypes?.length
      ? data.itemTypes.map((t) => `market:${t}`)
      : ['market:all'];

    for (const room of rooms) {
      await client.join(room);
    }

    this.logger.log(`[RECV] client=${client.id} | event=subscribe-market | rooms=${JSON.stringify(rooms)}`);

    return { status: 'success', subscribed: rooms };
  }

  /**
   * 订阅拍卖更新
   */
  @SubscribeMessage('subscribe-auction')
  async handleSubscribeAuction(@ConnectedSocket() client: Socket) {
    await client.join('auction:all');
    this.logger.log(`[RECV] client=${client.id} | event=subscribe-auction`);
    return { status: 'success', message: '已订阅拍卖更新' };
  }

  /**
   * 取消订阅
   */
  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @MessageBody() data: { rooms: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    for (const room of data.rooms) {
      await client.leave(room);
    }
    this.logger.log(`[RECV] client=${client.id} | event=unsubscribe | rooms=${JSON.stringify(data.rooms)}`);
    return { status: 'success' };
  }

  /**
   * 广播新上架物品
   */
  broadcastNewListing(itemType: string, listingData: any) {
    this.server.to(`market:${itemType}`).to('market:all').emit('new-listing', listingData);
    this.logger.log(`[BROADCAST] event=new-listing | itemType=${itemType} | data=${JSON.stringify(listingData)}`);
  }

  /**
   * 广播交易成交
   */
  broadcastTradeComplete(tradeData: any) {
    this.server.emit('trade-complete', {
      ...tradeData,
      timestamp: Date.now(),
    });
    this.logger.log(`[BROADCAST] event=trade-complete | data=${JSON.stringify(tradeData)}`);
  }

  /**
   * 广播新拍卖
   */
  broadcastNewAuction(auctionData: any) {
    this.server.to('auction:all').emit('new-auction', auctionData);
    this.logger.log(`[BROADCAST] event=new-auction | data=${JSON.stringify(auctionData)}`);
  }

  /**
   * 广播出价更新
   */
  broadcastBidUpdate(auctionId: string, bidData: any) {
    this.server.to('auction:all').emit('bid-update', {
      auctionId,
      ...bidData,
      timestamp: Date.now(),
    });
    this.logger.log(`[BROADCAST] event=bid-update | auctionId=${auctionId} | data=${JSON.stringify(bidData)}`);
  }

  /**
   * 广播拍卖结束
   */
  broadcastAuctionEnd(auctionId: string, result: any) {
    this.server.to('auction:all').emit('auction-end', {
      auctionId,
      ...result,
      timestamp: Date.now(),
    });
    this.logger.log(`[BROADCAST] event=auction-end | auctionId=${auctionId} | data=${JSON.stringify(result)}`);
  }

  /**
   * 发送个人交易通知
   */
  notifyPlayer(playerId: string, event: string, data: any) {
    this.server.to(`player:${playerId}`).emit(event, {
      ...data,
      timestamp: Date.now(),
    });
    this.logger.log(`[PUSH] player=${playerId} | event=${event} | data=${JSON.stringify(data)}`);
  }
}
