/**
 * Redis Pub/Sub 服务
 * 用于跨进程/跨服务的事件通知，实现 HTTP 与 WebSocket 状态同步
 */

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

export interface IRedisPubSubMessage {
  /** 事件类型 */
  event: string;
  /** 事件数据 */
  payload: unknown;
  /** 发送者实例ID */
  senderId: string;
  /** 目标玩家ID (可选，用于定向推送) */
  targetPlayerId?: string;
  /** 时间戳 */
  timestamp: number;
}

export type PubSubHandler = (message: IRedisPubSubMessage) => void | Promise<void>;

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);
  private readonly instanceId = `instance_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  /** 发布客户端 */
  private pubClient: Redis;
  /** 订阅客户端 */
  private subClient: Redis;
  /** 处理器映射 */
  private handlers = new Map<string, Set<PubSubHandler>>();
  /** 是否已连接 */
  private isConnected = false;

  constructor(private readonly redisClient: Redis) {
    // 创建独立的发布和订阅客户端
    this.pubClient = redisClient.duplicate();
    this.subClient = redisClient.duplicate();
  }

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  /**
   * 连接 Redis Pub/Sub
   */
  private async connect(): Promise<void> {
    if (this.isConnected) return;

    // 处理订阅消息
    this.subClient.on('message', (channel: string, message: string) => {
      this.handleMessage(channel, message);
    });

    // 处理 psubscribe 消息 (模式订阅)
    this.subClient.on('pmessage', (pattern: string, channel: string, message: string) => {
      this.handleMessage(channel, message, pattern);
    });

    // 错误处理
    this.pubClient.on('error', (err) => {
      this.logger.error('Redis pub client error:', err);
    });

    this.subClient.on('error', (err) => {
      this.logger.error('Redis sub client error:', err);
    });

    this.isConnected = true;
    this.logger.log(`Redis Pub/Sub connected, instance: ${this.instanceId}`);
  }

  /**
   * 断开连接
   */
  private async disconnect(): Promise<void> {
    try {
      await this.subClient.quit();
      await this.pubClient.quit();
      this.isConnected = false;
      this.logger.log('Redis Pub/Sub disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting Redis Pub/Sub:', error);
    }
  }

  /**
   * 发布事件到指定频道
   * @param channel 频道名称
   * @param event 事件类型
   * @param payload 事件数据
   * @param targetPlayerId 目标玩家ID (可选)
   */
  async publish(
    channel: string,
    event: string,
    payload: unknown,
    targetPlayerId?: string,
  ): Promise<void> {
    const message: IRedisPubSubMessage = {
      event,
      payload,
      senderId: this.instanceId,
      targetPlayerId,
      timestamp: Date.now(),
    };

    try {
      await this.pubClient.publish(channel, JSON.stringify(message));
    } catch (error) {
      this.logger.error(`Failed to publish to channel ${channel}:`, error);
    }
  }

  /**
   * 订阅指定频道
   * @param channel 频道名称
   * @param handler 消息处理器
   * @returns 取消订阅函数
   */
  subscribe(channel: string, handler: PubSubHandler): () => void {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
      // 首次订阅该频道
      this.subClient.subscribe(channel).catch((err) => {
        this.logger.error(`Failed to subscribe to channel ${channel}:`, err);
      });
    }

    const channelHandlers = this.handlers.get(channel)!;
    channelHandlers.add(handler);

    this.logger.debug(`Subscribed to channel: ${channel}`);

    // 返回取消订阅函数
    return () => {
      channelHandlers.delete(handler);
      if (channelHandlers.size === 0) {
        this.handlers.delete(channel);
        this.subClient.unsubscribe(channel).catch((err) => {
          this.logger.error(`Failed to unsubscribe from channel ${channel}:`, err);
        });
      }
    };
  }

  /**
   * 模式订阅 (支持通配符)
   * @param pattern 模式，如 "player:*:events"
   * @param handler 消息处理器
   * @returns 取消订阅函数
   */
  psubscribe(pattern: string, handler: PubSubHandler): () => void {
    // 将模式作为频道存储
    if (!this.handlers.has(pattern)) {
      this.handlers.set(pattern, new Set());
      this.subClient.psubscribe(pattern).catch((err) => {
        this.logger.error(`Failed to psubscribe to pattern ${pattern}:`, err);
      });
    }

    const patternHandlers = this.handlers.get(pattern)!;
    patternHandlers.add(handler);

    this.logger.debug(`Pattern subscribed to: ${pattern}`);

    return () => {
      patternHandlers.delete(handler);
      if (patternHandlers.size === 0) {
        this.handlers.delete(pattern);
        this.subClient.punsubscribe(pattern).catch((err) => {
          this.logger.error(`Failed to punsubscribe from pattern ${pattern}:`, err);
        });
      }
    };
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(channel: string, messageStr: string, pattern?: string): Promise<void> {
    // 忽略自己发送的消息 (可选，根据业务需求)
    const lookupKey = pattern || channel;
    const handlers = this.handlers.get(lookupKey);

    if (!handlers || handlers.size === 0) {
      return;
    }

    try {
      const message: IRedisPubSubMessage = JSON.parse(messageStr);

      // 可选：忽略自己实例发送的消息，避免回声
      // if (message.senderId === this.instanceId) return;

      const promises: Promise<void>[] = [];
      handlers.forEach((handler) => {
        try {
          const result = handler(message);
          if (result instanceof Promise) {
            promises.push(result.catch((err) => {
              this.logger.error(`Handler error for channel ${channel}:`, err);
            }));
          }
        } catch (err) {
          this.logger.error(`Handler sync error for channel ${channel}:`, err);
        }
      });

      return Promise.all(promises).then(() => undefined);
    } catch (error) {
      this.logger.error(`Failed to parse message from channel ${channel}:`, error);
    }
  }

  /**
   * 获取当前实例ID
   */
  getInstanceId(): string {
    return this.instanceId;
  }

  /**
   * 获取订阅的频道列表
   */
  getSubscribedChannels(): string[] {
    return Array.from(this.handlers.keys());
  }
}
