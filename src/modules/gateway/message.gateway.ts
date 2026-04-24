/**
 * 基于消息号的消息网关
 * 统一处理所有 WebSocket 消息，通过消息号路由
 * 支持 Protobuf 和 JSON 双协议
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IAuthenticatedSocket } from '../../common/guards/jwt-auth.guard';
import { MessageRouter, IGameMessage } from '../../core/message-router';
import { ProtobufService } from '../../shared/protobuf/protobuf.service';
import { AuthService } from '../auth/auth.service';
import { Player, PlayerDocument } from '../../database/schemas/player.schema';
import {
  getMessageName,
  getResponseCode,
  isRequest,
  ErrorCodes,
  SystemCodes,
  AuthCodes,
  PlayerCodes,
} from '../../shared/constants/message-codes';

/**
 * WebSocket 消息体
 */
interface IWSMessageBody {
  /** 消息号 */
  code: number;
  /** 序列号 */
  seq: number;
  /** 消息数据 (可能是 JSON 或 Protobuf) */
  payload: unknown;
  /** 是否使用 protobuf */
  useProtobuf?: boolean;
}

/**
 * WebSocket 原始消息格式
 * 支持 Buffer (protobuf) 或 string (json)
 */
interface IRawMessage {
  code: number;
  seq: number;
  payload: unknown;
}

@Injectable()
@WebSocketGateway({
  namespace: '/',
  cors: {
    origin: '*',
    credentials: false,
  },
  transports: ['websocket', 'polling'],
  // 允许原生 WebSocket 连接
  allowEIO3: true,
})
export class MessageGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessageGateway.name);
  /** 玩家ID到Socket的映射 */
  private playerSockets = new Map<string, string>();

  constructor(
    private readonly messageRouter: MessageRouter,
    private readonly protobufService: ProtobufService,
    private readonly jwtService: JwtService,
    @InjectModel(Player.name)
    private readonly playerModel: Model<PlayerDocument>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  /**
   * 模块初始化时注册消息处理器
   */
  onModuleInit() {
    this.registerHandlers();
  }

  /**
   * 注册消息处理器
   * 实际项目中应该由各个模块自己注册
   */
  private registerHandlers(): void {
    // ========== 系统级消息 ==========
    this.messageRouter.register(SystemCodes.HEARTBEAT_REQ, async (msg) => {
      return { serverTime: Date.now() };
    });

    this.messageRouter.register(SystemCodes.TIME_SYNC_REQ, async (msg) => {
      return { serverTime: Date.now() };
    });

    // ========== 认证消息 ==========
    this.messageRouter.register(
      AuthCodes.WECHAT_LOGIN_REQ,
      async (msg) => {
        const { code } = msg.payload as { code: string };
        try {
          const result = await this.authService.wechatLogin(code);
          return {
            success: true,
            playerId: result.playerId,
            tokens: result.tokens,
            isNewPlayer: result.isNewPlayer,
            playerData: result.playerData,
            inventory: result.inventory,
          };
        } catch (error) {
          throw error;
        }
      },
      { requireAuth: false },
    );

    // 账号注册消息处理器
    this.messageRouter.register(
      AuthCodes.ACCOUNT_REGISTER_REQ,
      async (msg) => {
        const { username, password } = msg.payload as { username: string; password: string };
        try {
          const result = await this.authService.accountRegister(username, password);
          return {
            success: true,
            playerId: result.playerId,
            tokens: result.tokens,
            isNewPlayer: result.isNewPlayer,
            playerData: result.playerData,
            inventory: result.inventory,
          };
        } catch (error) {
          throw error;
        }
      },
      { requireAuth: false },
    );

    // 账号登录消息处理器
    this.messageRouter.register(
      AuthCodes.ACCOUNT_LOGIN_REQ,
      async (msg) => {
        const { username, password } = msg.payload as { username: string; password: string };
        try {
          const result = await this.authService.accountLogin(username, password);
          return {
            success: true,
            playerId: result.playerId,
            tokens: result.tokens,
            isNewPlayer: result.isNewPlayer,
            playerData: result.playerData,
            inventory: result.inventory,
          };
        } catch (error) {
          throw error;
        }
      },
      { requireAuth: false },
    );

    // ========== 玩家消息 ==========
    this.messageRouter.register(PlayerCodes.GET_PLAYER_DATA_REQ, async (msg) => {
      // 实际调用 PlayerService
      return {
        playerId: msg.playerId,
        nickname: '测试玩家',
        level: 50,
      };
    });

    // 获取玩家背包
    this.messageRouter.register(PlayerCodes.GET_INVENTORY_REQ, async (msg) => {
      if (!msg.playerId) {
        throw new Error('未登录');
      }
      const player = await this.playerModel.findById(msg.playerId);
      if (!player) {
        throw new Error('玩家不存在');
      }
      const inventory: Record<string, number> = {};
      if (player.inventory) {
        player.inventory.forEach((value, key) => {
          inventory[key] = value;
        });
      }
      return { inventory };
    });

    // 获取玩家数据
    this.messageRouter.register(PlayerCodes.GET_PLAYER_DATA_REQ, async (msg) => {
      // 实际调用 PlayerService
      return {
        playerId: msg.playerId,
        nickname: '测试玩家',
        level: 50,
      };
    });

    this.messageRouter.register(PlayerCodes.USE_ITEM_REQ, async (msg) => {
      const { itemId, quantity } = msg.payload as { itemId: string; quantity: number };
      // 实际调用 PlayerService.useItem
      return { success: true, itemId, used: quantity };
    });

    // 打印路由表
    this.messageRouter.printRouteTable();
  }

  /**
   * 网关初始化完成
   */
  afterInit(server: Server) {
    this.logger.log('Message Gateway initialized');

    // 添加连接事件监听（最底层）
    server.on('connection', (socket) => {
      this.logger.log(`🔌 [RAW CONNECTION] Socket connected: ${socket.id}`);
    });

    server.on('connect', (socket) => {
      this.logger.log(`🔌 [RAW CONNECT] Socket connect event: ${socket.id}`);
    });
  }

  /**
   * 连接建立
   * 客户端连接 URL: ws://host/game?token=<jwt_token>
   */
  async handleConnection(client: IAuthenticatedSocket) {
    // 尝试从 token 提取 playerId
    const token = this.extractTokenFromSocket(client);
    let playerId: string | undefined;

    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync(token);
        if (payload.type === 'access' && payload.playerId) {
          playerId = payload.playerId;
          client.data.playerId = playerId;
          client.data.openId = payload.openId;
        }
      } catch (error) {
        this.logger.warn(`Token verification failed: ${error.message}`);
      }
    }

    const transport = client.conn?.transport?.name || 'unknown';
    const clientCount = (this.server?.sockets as any)?.size || 1;

    // 打印醒目的连接日志
    this.logger.log('═══════════════════════════════════════════════════════');
    this.logger.log(`🟢 [CONNECT] /game namespace`);
    this.logger.log(`   clientId: ${client.id}`);
    this.logger.log(`   playerId: ${playerId || 'anonymous (未认证)'}`);
    this.logger.log(`   transport: ${transport}`);
    this.logger.log(`   totalClients: ${clientCount}`);
    this.logger.log('═══════════════════════════════════════════════════════');

    // 发送连接确认
    client.emit('connected', {
      clientId: client.id,
      playerId: playerId || null,
      timestamp: Date.now(),
      message: playerId ? 'Authenticated' : 'Anonymous (test mode)',
    });

    if (playerId) {
      this.playerSockets.set(playerId, client.id);
    }
  }

  /**
   * 连接断开
   */
  handleDisconnect(client: IAuthenticatedSocket) {
    const playerId = client.data?.playerId;
    const transport = client.conn?.transport?.name || 'unknown';

    // 打印醒目的断开日志
    this.logger.log('───────────────────────────────────────────────────────');
    this.logger.log(`🔴 [DISCONNECT] /game namespace`);
    this.logger.log(`   clientId: ${client.id}`);
    this.logger.log(`   playerId: ${playerId || 'anonymous'}`);
    this.logger.log(`   transport: ${transport}`);
    this.logger.log('───────────────────────────────────────────────────────');

    if (playerId) {
      this.playerSockets.delete(playerId);
    }
  }

  /**
   * 统一消息入口
   * 所有客户端消息都发送到 'message' 事件
   * 支持 Protobuf 和 JSON 自动检测
   */
  @SubscribeMessage('message')
  async handleMessage(
    @MessageBody() rawData: Buffer | ArrayBuffer | string | IWSMessageBody,
    @ConnectedSocket() client: IAuthenticatedSocket,
  ) {
    const startTime = Date.now();

    // 如果还没有 playerId，尝试从 token 验证
    if (!client.data?.playerId) {
      const token = this.extractTokenFromSocket(client);
      this.logger.debug(`[AUTH DEBUG] Extracted token: ${token ? 'yes' : 'no'}, auth: ${JSON.stringify(client.handshake.auth)}, query: ${JSON.stringify(client.handshake.query)}`);

      if (token) {
        try {
          const payload = await this.jwtService.verifyAsync(token);
          if (payload.type === 'access' && payload.playerId) {
            client.data.playerId = payload.playerId;
            client.data.openId = payload.openId;
            this.playerSockets.set(payload.playerId, client.id);
            this.logger.debug(`[AUTH] Player authenticated: ${payload.playerId}`);
          }
        } catch (error) {
          this.logger.warn(`Token verification failed: ${error.message}`);
        }
      }
    }

    const playerId = client.data?.playerId;

    // 解析消息（支持 protobuf 和 json）
    const parsed = this.parseMessage(rawData);
    if (!parsed) {
      this.logger.warn(`[RECV ERROR] Failed to parse message from client=${client.id}`);
      this.sendError(client, 0, 0, 'Failed to parse message', false);
      return;
    }

    const { data, isProtobuf } = parsed;
    const messageName = getMessageName(data.code);

    // 记录收到的消息 - 使用醒目的格式
    this.logger.log('┌───────────────────────────────────────────────────────');
    this.logger.log(`│ 📥 [RECV] 收到客户端消息`);
    this.logger.log(`│    clientId: ${client.id}`);
    this.logger.log(`│    playerId: ${playerId || 'anonymous'}`);
    this.logger.log(`│    code: ${data.code} (${messageName})`);
    this.logger.log(`│    seq: ${data.seq}`);
    this.logger.log(`│    format: ${isProtobuf ? 'protobuf' : 'json'}`);
    this.logger.log(`│    payload: ${JSON.stringify(data.payload)}`);
    this.logger.log('└───────────────────────────────────────────────────────');

    // 构建游戏消息
    const message: IGameMessage = {
      code: data.code,
      payload: data.payload,
      playerId,
      seq: data.seq,
      timestamp: Date.now(),
    };

    try {
      // 路由到对应的处理器
      const result = await this.messageRouter.route(message);

      // 发送响应
      const responseCode = getResponseCode(data.code);
      if (responseCode) {
        const processingTime = Date.now() - startTime;
        const response = {
          code: responseCode,
          seq: data.seq,
          payload: result,
          timestamp: Date.now(),
          processingTime,
        };

        // 根据客户端格式选择序列化方式
        if (isProtobuf) {
          this.sendProtobufMessage(client, 'message', response);
        } else {
          client.emit('message', response);
        }

        this.logger.log('┌───────────────────────────────────────────────────────');
        this.logger.log(`│ 📤 [SEND] 发送响应给客户端`);
        this.logger.log(`│    clientId: ${client.id}`);
        this.logger.log(`│    playerId: ${playerId || 'anonymous'}`);
        this.logger.log(`│    code: ${responseCode} (${getMessageName(responseCode)})`);
        this.logger.log(`│    seq: ${data.seq}`);
        this.logger.log(`│    format: ${isProtobuf ? 'protobuf' : 'json'}`);
        this.logger.log(`│    processingTime: ${processingTime}ms`);
        this.logger.log(`│    payload: ${JSON.stringify(result)}`);
        this.logger.log('└───────────────────────────────────────────────────────');
      }
    } catch (error) {
      // 发送错误响应
      const errorCode = getResponseCode(data.code) || data.code;
      const processingTime = Date.now() - startTime;

      this.sendError(
        client,
        errorCode,
        data.seq,
        error instanceof Error ? error.message : 'Unknown error',
        isProtobuf
      );

      this.logger.error('┌───────────────────────────────────────────────────────');
      this.logger.error(`│ ❌ [ERROR] 处理消息时发生错误`);
      this.logger.error(`│    clientId: ${client.id}`);
      this.logger.error(`│    playerId: ${playerId || 'anonymous'}`);
      this.logger.error(`│    code: ${data.code} (${messageName})`);
      this.logger.error(`│    seq: ${data.seq}`);
      this.logger.error(`│    error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.logger.error(`│    processingTime: ${processingTime}ms`);
      this.logger.error('└───────────────────────────────────────────────────────');
    }
  }

  /**
   * 解析消息（支持 Protobuf 和 JSON）
   */
  private parseMessage(rawData: Buffer | ArrayBuffer | string | IWSMessageBody): { data: IWSMessageBody; isProtobuf: boolean } | null {
    // 已经是解析好的 JSON 对象（socket.io 自动解析）
    if (typeof rawData === 'object' && !(rawData instanceof Buffer) && !(rawData instanceof ArrayBuffer)) {
      if ('code' in rawData && 'seq' in rawData) {
        return { data: rawData as IWSMessageBody, isProtobuf: false };
      }
    }

    let buffer: Buffer;

    // 转换为 Buffer
    if (rawData instanceof ArrayBuffer) {
      buffer = Buffer.from(rawData);
    } else if (typeof rawData === 'string') {
      // JSON 字符串
      try {
        const data = JSON.parse(rawData) as IWSMessageBody;
        return { data, isProtobuf: false };
      } catch {
        return null;
      }
    } else {
      buffer = rawData;
    }

    // 尝试 Protobuf 解码
    const wsMessage = this.protobufService.decode<{ event: string; payload: Buffer; seq?: number }>(
      'taixu.WebSocketMessage',
      buffer,
    );

    if (wsMessage && wsMessage.payload) {
      try {
        const payload = JSON.parse(wsMessage.payload.toString());
        return {
          data: {
            code: payload.code,
            seq: payload.seq || 0,
            payload: payload.payload,
          },
          isProtobuf: true,
        };
      } catch {
        // payload 不是 JSON，直接返回原始数据
        return {
          data: {
            code: 0,
            seq: wsMessage.seq || 0,
            payload: wsMessage.payload,
          },
          isProtobuf: true,
        };
      }
    }

    // 尝试 JSON 解码
    try {
      const data = JSON.parse(buffer.toString()) as IWSMessageBody;
      return { data, isProtobuf: false };
    } catch {
      return null;
    }
  }

  /**
   * 发送 Protobuf 格式的消息
   */
  private sendProtobufMessage(client: IAuthenticatedSocket, event: string, payload: unknown): void {
    const wsMessage = {
      event,
      payload: Buffer.from(JSON.stringify(payload)),
      timestamp: Date.now(),
      seq: 0,
    };

    const buffer = this.protobufService.encode('taixu.WebSocketMessage', wsMessage);
    if (buffer) {
      client.emit('message', buffer);
    } else {
      // 降级到 JSON
      client.emit('message', payload);
    }
  }

  /**
   * 发送错误响应
   */
  private sendError(
    client: IAuthenticatedSocket,
    code: number,
    seq: number,
    errorMessage: string,
    useProtobuf: boolean,
  ): void {
    const response = {
      code,
      seq,
      payload: null,
      error: {
        code: ErrorCodes.UNKNOWN_ERROR,
        message: errorMessage,
      },
      timestamp: Date.now(),
      processingTime: 0,
    };

    if (useProtobuf) {
      this.sendProtobufMessage(client, 'message', response);
    } else {
      client.emit('message', response);
    }
  }

  /**
   * 推送消息给指定玩家
   * 自动检测客户端是否使用 protobuf
   */
  pushToPlayer(playerId: string, code: number, payload: unknown, useProtobuf?: boolean): boolean {
    const socketId = this.playerSockets.get(playerId);
    if (!socketId) {
      this.logger.warn(`[PUSH FAILED] player=${playerId} not connected | code=${code} (${getMessageName(code)})`);
      return false;
    }

    const message = {
      code,
      seq: 0, // 推送消息的序列号为 0
      payload,
      timestamp: Date.now(),
    };

    // 如果指定了 protobuf，使用 protobuf 编码
    if (useProtobuf) {
      const wsMessage = {
        event: 'push',
        payload: Buffer.from(JSON.stringify(message)),
        timestamp: Date.now(),
        seq: 0,
      };
      const buffer = this.protobufService.encode('taixu.WebSocketMessage', wsMessage);
      if (buffer) {
        this.server.to(socketId).emit('push', buffer);
      } else {
        this.server.to(socketId).emit('push', message);
      }
    } else {
      this.server.to(socketId).emit('push', message);
    }

    this.logger.log(
      `[PUSH] socket=${socketId} | player=${playerId} | ` +
      `code=${code} (${getMessageName(code)}) | format=${useProtobuf ? 'protobuf' : 'json'} | payload=${JSON.stringify(payload)}`
    );
    return true;
  }

  /**
   * 广播消息给所有玩家
   */
  broadcast(code: number, payload: unknown, useProtobuf = false): void {
    const clientCount = (this.server?.sockets as any)?.size || 0;
    const message = {
      code,
      seq: 0,
      payload,
      timestamp: Date.now(),
    };

    // 广播通常使用 JSON，因为客户端可能混合使用不同协议
    this.server.emit('broadcast', message);
    this.logger.log(
      `[BROADCAST] code=${code} (${getMessageName(code)}) | ` +
      `clients=${clientCount} | format=${useProtobuf ? 'protobuf' : 'json'} | payload=${JSON.stringify(payload)}`
    );
  }

  /**
   * 广播给指定房间
   */
  broadcastToRoom(roomId: string, code: number, payload: unknown, useProtobuf = false): void {
    const message = {
      code,
      seq: 0,
      payload,
      timestamp: Date.now(),
    };

    this.server.to(roomId).emit('push', message);
    this.logger.log(
      `[ROOM BROADCAST] room=${roomId} | code=${code} (${getMessageName(code)}) | ` +
      `format=${useProtobuf ? 'protobuf' : 'json'} | payload=${JSON.stringify(payload)}`
    );
  }

  /**
   * 从 WebSocket 连接中提取 Token
   */
  private extractTokenFromSocket(client: IAuthenticatedSocket): string | undefined {
    // 方式1: 从 handshake.auth 获取 (Socket.IO 传递的 auth 对象)
    // 可能是字符串或对象
    const authToken = client.handshake.auth?.token;
    if (authToken) {
      return typeof authToken === 'string' ? authToken : authToken;
    }

    // 方式2: 从 handshake.query 获取 (ws://url?token=xxx)
    const queryToken = client.handshake.query.token;
    if (queryToken) {
      return Array.isArray(queryToken) ? queryToken[0] : queryToken;
    }

    // 方式3: 从 handshake.headers.authorization 获取
    const headerAuth = client.handshake.headers.authorization;
    if (headerAuth) {
      const [type, token] = headerAuth.split(' ');
      if (type === 'Bearer' && token) {
        return token;
      }
    }

    return undefined;
  }
}
