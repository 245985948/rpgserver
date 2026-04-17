/**
 * 仙府WebSocket网关
 * 处理仙府实时通知
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

@WebSocketGateway({
  namespace: 'estate',
  cors: {
    origin: '*',
  },
})
export class EstateGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EstateGateway.name);

  /**
   * 订阅仙府更新
   */
  @SubscribeMessage('subscribe-estate')
  async handleSubscribe(
    @MessageBody() data: { playerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = `estate:${data.playerId}`;
    await client.join(roomId);

    this.logger.log(`[RECV] client=${client.id} | event=subscribe-estate | playerId=${data.playerId}`);

    return { status: 'success', message: '已订阅仙府更新' };
  }

  /**
   * 取消订阅
   */
  @SubscribeMessage('unsubscribe-estate')
  async handleUnsubscribe(
    @MessageBody() data: { playerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = `estate:${data.playerId}`;
    await client.leave(roomId);

    return { status: 'success', message: '已取消订阅' };
  }

  /**
   * 广播仙府更新
   */
  broadcastEstateUpdate(playerId: string, data: any) {
    this.server.to(`estate:${playerId}`).emit('estate-update', data);
    this.logger.log(`[PUSH] player=${playerId} | event=estate-update | data=${JSON.stringify(data)}`);
  }

  /**
   * 通知建造完成
   */
  notifyBuildingComplete(playerId: string, buildingType: string) {
    const message = {
      buildingType,
      timestamp: Date.now(),
    };
    this.server.to(`estate:${playerId}`).emit('building-complete', message);
    this.logger.log(`[PUSH] player=${playerId} | event=building-complete | buildingType=${buildingType}`);
  }

  /**
   * 通知访客
   */
  notifyVisitor(playerId: string, visitorData: any) {
    const message = {
      ...visitorData,
      timestamp: Date.now(),
    };
    this.server.to(`estate:${playerId}`).emit('visitor-arrived', message);
    this.logger.log(`[PUSH] player=${playerId} | event=visitor-arrived | data=${JSON.stringify(visitorData)}`);
  }
}
