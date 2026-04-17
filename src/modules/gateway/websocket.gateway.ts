/**
 * 原生 WebSocket 网关
 * 为不支持 Socket.IO 的客户端提供原生 WebSocket 支持
 */

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger, Injectable, OnModuleInit } from '@nestjs/common';
import { WebSocket } from 'ws';
import { MessageRouter, IGameMessage } from '../../core/message-router';
import {
  getMessageName,
  getResponseCode,
  ErrorCodes,
  PlayerCodes,
  SystemCodes,
  AuthCodes,
} from '../../shared/constants/message-codes';

/**
 * WebSocket 消息体
 */
interface IWSMessageBody {
  code: number;
  seq: number;
  payload: unknown;
  timestamp?: number;
}

@Injectable()
@WebSocketGateway({
  namespace: 'game-ws',
  transports: ['websocket'],
  cors: {
    origin: '*',
    credentials: false,
  },
})
export class WebSocketGatewayImpl
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGatewayImpl.name);

  constructor(private readonly messageRouter: MessageRouter) {}

  onModuleInit() {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // 系统消息
    this.messageRouter.register(SystemCodes.HEARTBEAT_REQ, async (msg) => {
      return { serverTime: Date.now() };
    });

    // 认证消息
    this.messageRouter.register(
      AuthCodes.WECHAT_LOGIN_REQ,
      async (msg) => {
        return { success: true, token: 'mock_token', playerId: 'test_player' };
      },
      { requireAuth: false },
    );

    // 玩家消息
    this.messageRouter.register(PlayerCodes.GET_PLAYER_DATA_REQ, async (msg) => {
      this.logger.log(`[GET_PLAYER_DATA] playerId=${msg.playerId || 'anonymous'}`);
      return {
        playerId: msg.playerId || 'test_player',
        nickname: '测试玩家',
        level: 50,
        realm: '筑基期',
        exp: 12345,
        maxExp: 20000,
        vipLevel: 1,
        fightingPower: 9999,
        currency: {
          spiritStones: 1000,
          contribution: 500,
          prestige: 100,
          immortalJade: 50,
        },
        attributes: {
          hp: 1000,
          maxHp: 1000,
          mp: 500,
          maxMp: 500,
          attack: 100,
          defense: 50,
          speed: 20,
        },
      };
    });

    this.messageRouter.register(PlayerCodes.USE_ITEM_REQ, async (msg) => {
      const { itemId, quantity } = msg.payload as { itemId: string; quantity: number };
      return { success: true, itemId, used: quantity };
    });

    this.logger.log('WebSocket Gateway handlers registered');
    this.messageRouter.printRouteTable();
  }

  afterInit(server: Server) {
    this.logger.log('Native WebSocket Gateway initialized on namespace: /game-ws');

    // 拦截 WebSocket 升级，处理原生 WebSocket 消息
    server.engine.on('connection_error', (err: any) => {
      this.logger.error('Connection error:', err);
    });
  }

  handleConnection(client: WebSocket & { id?: string }) {
    const clientId = (client as any).id || Math.random().toString(36).substring(2, 9);
    (client as any).id = clientId;

    this.logger.log(`[CONNECT] /game-ws | clientId=${clientId}`);

    // 设置消息处理器
    client.on('message', async (data: Buffer | ArrayBuffer | string) => {
      await this.handleRawMessage(client, data);
    });

    // 发送连接确认
    this.sendToClient(client, {
      code: 0,
      seq: 0,
      payload: { connected: true, clientId },
      timestamp: Date.now(),
    });
  }

  handleDisconnect(client: WebSocket & { id?: string }) {
    const clientId = (client as any).id || 'unknown';
    this.logger.log(`[DISCONNECT] /game-ws | clientId=${clientId}`);
  }

  /**
   * 处理原始 WebSocket 消息
   */
  private async handleRawMessage(
    client: WebSocket & { id?: string },
    rawData: Buffer | ArrayBuffer | string,
  ): Promise<void> {
    const startTime = Date.now();
    const clientId = (client as any).id || 'unknown';

    // 解析消息
    let message: IWSMessageBody;
    try {
      if (Buffer.isBuffer(rawData)) {
        message = JSON.parse(rawData.toString());
      } else if (typeof rawData === 'string') {
        message = JSON.parse(rawData);
      } else {
        // ArrayBuffer
        message = JSON.parse(Buffer.from(rawData).toString());
      }
    } catch (error) {
      this.logger.warn(`[PARSE ERROR] client=${clientId} | data=${rawData.toString().substring(0, 100)}`);
      this.sendError(client, 0, 0, 'Invalid JSON format');
      return;
    }

    const { code, seq, payload } = message;
    const messageName = getMessageName(code);

    this.logger.log(
      `[RECV] client=${clientId} | code=${code} (${messageName}) | seq=${seq} | payload=${JSON.stringify(payload)}`,
    );

    // 构建游戏消息
    const gameMessage: IGameMessage = {
      code,
      payload,
      playerId: (client as any).playerId,
      seq,
      timestamp: Date.now(),
    };

    try {
      // 路由到处理器
      const result = await this.messageRouter.route(gameMessage);

      // 发送响应
      const responseCode = getResponseCode(code);
      if (responseCode) {
        const processingTime = Date.now() - startTime;
        this.sendToClient(client, {
          code: responseCode,
          seq,
          payload: result,
          timestamp: Date.now(),
          processingTime,
        });

        this.logger.log(
          `[SEND] client=${clientId} | code=${responseCode} (${getMessageName(responseCode)}) | seq=${seq} | ${processingTime}ms`,
        );
      }
    } catch (error) {
      const errorCode = getResponseCode(code) || code;
      this.sendError(
        client,
        errorCode,
        seq,
        error instanceof Error ? error.message : 'Unknown error',
      );

      this.logger.error(
        `[ERROR] client=${clientId} | code=${code} (${messageName}) | seq=${seq} | error=${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  /**
   * 发送消息到客户端
   */
  private sendToClient(client: WebSocket, message: any): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  /**
   * 发送错误响应
   */
  private sendError(client: WebSocket, code: number, seq: number, errorMessage: string): void {
    this.sendToClient(client, {
      code,
      seq,
      payload: null,
      error: {
        code: ErrorCodes.UNKNOWN_ERROR,
        message: errorMessage,
      },
      timestamp: Date.now(),
    });
  }
}
