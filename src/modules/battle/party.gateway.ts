/**
 * 组队WebSocket网关
 * 处理实时组队通信，支持跨服务事件同步
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { EventManager } from '../../core/event.manager';
import { CrossServiceEventType } from '../../core/cross-service.event-bus';

interface IPartyMessage {
  type: 'join' | 'leave' | 'ready' | 'start' | 'chat';
  payload: any;
}

@WebSocketGateway({
  namespace: 'party',
  cors: {
    origin: '*',
  },
})
export class PartyGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PartyGateway.name);
  /** 玩家ID到Socket的映射 */
  private playerSocketMap = new Map<string, string>();

  constructor(
    private redisService: RedisService,
    private eventManager: EventManager,
  ) {}

  /**
   * 模块初始化时订阅跨服务事件
   */
  onModuleInit() {
    this.subscribeToCrossServiceEvents();
  }

  /**
   * 订阅跨服务事件
   * 用于接收 HTTP 服务发送的玩家属性变更通知
   */
  private subscribeToCrossServiceEvents(): void {
    // 订阅玩家属性变更事件
    this.eventManager.onCrossService(CrossServiceEventType.PLAYER_ATTR_CHANGED).subscribe({
      next: (event) => {
        const payload = event.payload as {
          playerId: string;
          changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
          reason: string;
        };

        // 如果该玩家在线，推送属性变更通知
        const socketId = this.playerSocketMap.get(payload.playerId);
        if (socketId) {
          this.server.to(socketId).emit('player-attr-changed', {
            changes: payload.changes,
            reason: payload.reason,
            timestamp: event.timestamp,
          });
          this.logger.log(
            `[PUSH] socket=${socketId} | player=${payload.playerId} | event=player-attr-changed | reason=${payload.reason}`,
          );
        }
      },
      error: (err) => this.logger.error('Error in player attr changed subscription:', err),
    });

    // 订阅货币变更事件
    this.eventManager.onCrossService(CrossServiceEventType.PLAYER_CURRENCY_CHANGED).subscribe({
      next: (event) => {
        const payload = event.payload as {
          playerId: string;
          currencyType: string;
          delta: number;
          newValue: number;
          reason: string;
        };

        const socketId = this.playerSocketMap.get(payload.playerId);
        if (socketId) {
          this.server.to(socketId).emit('currency-changed', {
            currencyType: payload.currencyType,
            delta: payload.delta,
            newValue: payload.newValue,
            reason: payload.reason,
            timestamp: event.timestamp,
          });
        }
      },
      error: (err) => this.logger.error('Error in currency changed subscription:', err),
    });

    // 订阅物品变更事件
    this.eventManager.onCrossService(CrossServiceEventType.PLAYER_INVENTORY_CHANGED).subscribe({
      next: (event) => {
        const payload = event.payload as {
          playerId: string;
          itemId: string;
          itemName: string;
          delta: number;
          newQuantity: number;
          reason: string;
        };

        const socketId = this.playerSocketMap.get(payload.playerId);
        if (socketId) {
          this.server.to(socketId).emit('inventory-changed', {
            itemId: payload.itemId,
            itemName: payload.itemName,
            delta: payload.delta,
            newQuantity: payload.newQuantity,
            reason: payload.reason,
            timestamp: event.timestamp,
          });
        }
      },
      error: (err) => this.logger.error('Error in inventory changed subscription:', err),
    });

    this.logger.log('Subscribed to cross-service events');
  }

  /**
   * 连接建立
   * 客户端应发送 playerId 进行身份绑定
   */
  handleConnection(client: Socket) {
    this.logger.log(`[CONNECT] /party | client=${client.id}`);

    // 监听身份绑定事件
    client.on('bind-player', (data: { playerId: string }) => {
      this.logger.log(`[RECV] client=${client.id} | event=bind-player | data=${JSON.stringify(data)}`);
      if (data.playerId) {
        this.playerSocketMap.set(data.playerId, client.id);
        // 将 playerId 存储在 socket 数据中
        client.data.playerId = data.playerId;
        this.logger.log(`[BIND] player=${data.playerId} bound to socket ${client.id}`);

        // 确认绑定成功
        client.emit('bind-success', { playerId: data.playerId });
        this.logger.log(`[SEND] client=${client.id} | event=bind-success | player=${data.playerId}`);
      }
    });
  }

  /**
   * 连接断开
   */
  handleDisconnect(client: Socket) {
    const playerId = client.data?.playerId;
    this.logger.log(`[DISCONNECT] /party | client=${client.id} | player=${playerId || 'anonymous'}`);

    // 清理 playerSocketMap
    if (playerId) {
      this.playerSocketMap.delete(playerId);
      this.logger.log(`[UNBIND] player ${playerId} removed from socket map`);
    }
  }

  /**
   * 加入队伍房间
   */
  @SubscribeMessage('join-party')
  async handleJoinParty(
    @MessageBody() data: { partyId: string; playerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = `party:${data.partyId}`;
    await client.join(roomId);

    // 通知房间内其他成员
    client.to(roomId).emit('member-joined', {
      playerId: data.playerId,
      timestamp: Date.now(),
    });

    this.logger.debug(`Player ${data.playerId} joined party room ${data.partyId}`);

    return { status: 'success', roomId };
  }

  /**
   * 离开队伍房间
   */
  @SubscribeMessage('leave-party')
  async handleLeaveParty(
    @MessageBody() data: { partyId: string; playerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = `party:${data.partyId}`;
    await client.leave(roomId);

    // 通知房间内其他成员
    client.to(roomId).emit('member-left', {
      playerId: data.playerId,
      timestamp: Date.now(),
    });

    this.logger.debug(`Player ${data.playerId} left party room ${data.partyId}`);

    return { status: 'success' };
  }

  /**
   * 准备状态变更
   */
  @SubscribeMessage('set-ready')
  async handleSetReady(
    @MessageBody() data: { partyId: string; playerId: string; isReady: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = `party:${data.partyId}`;

    // 广播准备状态
    this.server.to(roomId).emit('member-ready', {
      playerId: data.playerId,
      isReady: data.isReady,
      timestamp: Date.now(),
    });

    return { status: 'success' };
  }

  /**
   * 开始挑战
   */
  @SubscribeMessage('start-dungeon')
  async handleStartDungeon(
    @MessageBody() data: { partyId: string; dungeonId: string; leaderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = `party:${data.partyId}`;

    // 验证是否是队长
    // 实际应验证leaderId是否是该队伍队长

    // 通知所有成员开始
    this.server.to(roomId).emit('dungeon-start', {
      dungeonId: data.dungeonId,
      timestamp: Date.now(),
    });

    this.logger.debug(`Party ${data.partyId} started dungeon ${data.dungeonId}`);

    return { status: 'success' };
  }

  /**
   * 队伍聊天
   */
  @SubscribeMessage('party-chat')
  async handlePartyChat(
    @MessageBody() data: { partyId: string; playerId: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomId = `party:${data.partyId}`;

    // 广播消息
    this.server.to(roomId).emit('chat-message', {
      playerId: data.playerId,
      message: data.message,
      timestamp: Date.now(),
    });

    return { status: 'success' };
  }

  /**
   * 广播队伍更新
   */
  broadcastPartyUpdate(partyId: string, data: any) {
    this.server.to(`party:${partyId}`).emit('party-update', data);
  }
}
