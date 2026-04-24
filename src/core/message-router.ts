/**
 * 消息路由器
 * 负责将消息号路由到对应的处理器
 */

import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { getMessageName, getMessageModule } from '../shared/constants/message-codes';

/**
 * 游戏消息接口
 */
export interface IGameMessage<T = unknown> {
  /** 消息号 */
  code: number;
  /** 消息数据 */
  payload: T;
  /** 玩家ID */
  playerId?: string;
  /** 序列号 */
  seq: number;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 消息处理器类型
 */
export type MessageHandler<T = unknown, R = unknown> = (
  message: IGameMessage<T>,
) => Promise<R> | R;

/**
 * 消息路由配置
 */
export interface IRouteConfig {
  /** 消息号 */
  code: number;
  /** 处理函数 */
  handler: MessageHandler;
  /** 是否需要登录 */
  requireAuth?: boolean;
  /** 速率限制 (每秒请求数) */
  rateLimit?: number;
}

@Injectable()
export class MessageRouter {
  private readonly logger = new Logger(MessageRouter.name);
  private readonly messageBus = new Subject<IGameMessage>();
  private handlers = new Map<number, MessageHandler>();
  private routeConfigs = new Map<number, IRouteConfig>();

  /**
   * 注册消息处理器
   */
  register<T, R>(code: number, handler: MessageHandler<T, R>, config?: Omit<IRouteConfig, 'code' | 'handler'>): void {
    if (this.handlers.has(code)) {
      this.logger.warn(`Handler for code ${code} (${getMessageName(code)}) already exists, overwriting`);
    }

    this.handlers.set(code, handler as MessageHandler);
    this.routeConfigs.set(code, {
      code,
      handler: handler as MessageHandler,
      requireAuth: config?.requireAuth ?? true,
      rateLimit: config?.rateLimit,
    });

    this.logger.debug(`Registered handler for ${getMessageName(code)} (${code})`);
  }

  /**
   * 批量注册路由
   */
  registerRoutes(routes: IRouteConfig[]): void {
    for (const route of routes) {
      this.register(route.code, route.handler, {
        requireAuth: route.requireAuth,
        rateLimit: route.rateLimit,
      });
    }
  }

  /**
   * 路由消息到对应的处理器
   */
  async route<T, R>(message: IGameMessage<T>): Promise<R | null> {
    const { code, playerId, seq } = message;
    const config = this.routeConfigs.get(code);

    if (!config) {
      this.logger.warn(
        `⚠️  [ROUTE FAILED] 未注册的消息处理器 | player=${playerId || 'anonymous'} | ` +
        `code=${code} (${getMessageName(code)}) | seq=${seq}`
      );
      return null;
    }

    const handler = this.handlers.get(code);
    if (!handler) {
      this.logger.warn(
        `⚠️  [ROUTE FAILED] 处理器未找到 | player=${playerId || 'anonymous'} | ` +
        `code=${code} (${getMessageName(code)}) | seq=${seq}`
      );
      return null;
    }

    const startTime = Date.now();
    this.logger.log(`🔄 [ROUTE] 开始路由消息: ${getMessageName(code)} (code=${code}, seq=${seq})`);

    try {
      const result = await handler(message);

      const duration = Date.now() - startTime;
      if (duration > 100) {
        this.logger.warn(`⚠️  [SLOW HANDLER] ${getMessageName(code)}: ${duration}ms`);
      }

      this.logger.log(`✅ [HANDLED] 消息处理完成: ${getMessageName(code)} | seq=${seq} | ${duration}ms`);

      return result as R;
    } catch (error) {
      this.logger.error(
        `❌ [HANDLER ERROR] ${getMessageName(code)} (${code}) | player=${playerId || 'anonymous'} | ` +
        `seq=${seq}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * 订阅特定消息
   */
  on<T>(code: number): Observable<IGameMessage<T>> {
    return this.messageBus.pipe(
      filter((msg) => msg.code === code),
      map((msg) => msg as IGameMessage<T>),
    );
  }

  /**
   * 订阅多个消息
   */
  onMany(codes: number[]): Observable<IGameMessage> {
    return this.messageBus.pipe(filter((msg) => codes.includes(msg.code)));
  }

  /**
   * 订阅所有消息
   */
  onAll(): Observable<IGameMessage> {
    return this.messageBus.asObservable();
  }

  /**
   * 发布消息到总线
   */
  emit<T>(message: IGameMessage<T>): void {
    this.messageBus.next(message);
  }

  /**
   * 获取路由配置
   */
  getRouteConfig(code: number): IRouteConfig | undefined {
    return this.routeConfigs.get(code);
  }

  /**
   * 获取所有已注册的消息号
   */
  getRegisteredCodes(): number[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * 移除消息处理器
   */
  unregister(code: number): void {
    this.handlers.delete(code);
    this.routeConfigs.delete(code);
    this.logger.debug(`Unregistered handler for ${getMessageName(code)} (${code})`);
  }

  /**
   * 打印路由表 (用于调试)
   */
  printRouteTable(): void {
    this.logger.log('=== Message Route Table ===');

    const grouped = new Map<string, number[]>();

    for (const code of this.handlers.keys()) {
      const module = getMessageModule(code);
      if (!grouped.has(module)) {
        grouped.set(module, []);
      }
      grouped.get(module)!.push(code);
    }

    for (const [module, codes] of grouped) {
      this.logger.log(`\n[${module}]`);
      for (const code of codes.sort((a, b) => a - b)) {
        const config = this.routeConfigs.get(code);
        this.logger.log(
          `  ${code}: ${getMessageName(code).padEnd(30)} ` +
          `auth=${config?.requireAuth ? 'Y' : 'N'} ` +
          `rate=${config?.rateLimit ?? 'N/A'}`,
        );
      }
    }
  }
}
