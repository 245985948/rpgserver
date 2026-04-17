/**
 * 事件管理器
 * 提供类型安全的事件发布订阅机制，支持本地事件和跨服务事件
 */

import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable, filter, map } from 'rxjs';
import {
  CrossServiceEventBus,
  CrossServiceEventType,
  ICrossServiceEvent,
} from './cross-service.event-bus';

/**
 * 基础事件接口
 */
export interface IGameEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  playerId?: string;
}

/**
 * 事件处理器类型
 */
export type EventHandler<T> = (event: IGameEvent<T>) => void | Promise<void>;

@Injectable()
export class EventManager {
  private readonly logger = new Logger(EventManager.name);
  private readonly eventBus = new Subject<IGameEvent>();

  constructor(private readonly crossServiceEventBus?: CrossServiceEventBus) {}

  /**
   * 发布本地事件 (仅当前实例)
   */
  emitLocal<T>(type: string, payload: T, playerId?: string): void {
    const event: IGameEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
      playerId,
    };
    this.eventBus.next(event);
  }

  /**
   * 发布事件
   * 如果 eventType 是跨服务事件类型，同时会发送到 Redis
   */
  emit<T>(type: string, payload: T, playerId?: string): void {
    // 本地事件
    this.emitLocal(type, payload, playerId);

    // 如果是跨服务事件类型，同时发布到跨服务总线
    if (this.isCrossServiceEvent(type) && this.crossServiceEventBus) {
      this.crossServiceEventBus
        .publishGlobal(type as CrossServiceEventType, payload, playerId)
        .catch((err) => {
          this.logger.error(`Failed to emit cross-service event ${type}:`, err);
        });
    }
  }

  /**
   * 发布跨服务事件 (明确跨服务)
   */
  async emitCrossService<T>(
    eventType: CrossServiceEventType,
    payload: T,
    playerId?: string,
  ): Promise<void> {
    if (!this.crossServiceEventBus) {
      this.logger.warn('CrossServiceEventBus not available');
      return;
    }

    await this.crossServiceEventBus.publishGlobal(eventType, payload, playerId);
  }

  /**
   * 通知玩家属性变更 (跨服务)
   * 场景：HTTP 购买武器后，通知 WebSocket 更新战斗状态
   */
  async notifyPlayerAttrChanged(
    playerId: string,
    changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>,
    reason: string,
  ): Promise<void> {
    if (!this.crossServiceEventBus) {
      this.logger.warn('CrossServiceEventBus not available');
      return;
    }

    await this.crossServiceEventBus.notifyPlayerAttrChanged(playerId, changes, reason);
    this.logger.debug(`Notified player ${playerId} attr changed: ${reason}`);
  }

  /**
   * 通知货币变更 (跨服务)
   */
  async notifyCurrencyChanged(
    playerId: string,
    currencyType: string,
    delta: number,
    newValue: number,
    reason: string,
  ): Promise<void> {
    if (!this.crossServiceEventBus) {
      this.logger.warn('CrossServiceEventBus not available');
      return;
    }

    await this.crossServiceEventBus.notifyCurrencyChanged(
      playerId,
      currencyType,
      delta,
      newValue,
      reason,
    );
  }

  /**
   * 订阅特定类型事件 (本地)
   */
  on<T>(type: string): Observable<IGameEvent<T>> {
    return this.eventBus.pipe(
      filter((event) => event.type === type),
      map((event) => event as IGameEvent<T>),
    );
  }

  /**
   * 订阅特定玩家的特定类型事件 (本地)
   */
  onPlayerEvent<T>(type: string, playerId: string): Observable<IGameEvent<T>> {
    return this.eventBus.pipe(
      filter((event) => event.type === type && event.playerId === playerId),
      map((event) => event as IGameEvent<T>),
    );
  }

  /**
   * 订阅跨服务事件
   */
  onCrossService<T>(
    eventType: CrossServiceEventType,
  ): Observable<ICrossServiceEvent<T>> {
    if (!this.crossServiceEventBus) {
      this.logger.warn('CrossServiceEventBus not available');
      return new Observable();
    }

    return this.crossServiceEventBus.subscribeGlobal<T>(eventType);
  }

  /**
   * 订阅特定玩家的跨服务事件
   */
  onPlayerCrossService<T>(
    playerId: string,
    eventType?: CrossServiceEventType,
  ): Observable<ICrossServiceEvent<T>> {
    if (!this.crossServiceEventBus) {
      this.logger.warn('CrossServiceEventBus not available');
      return new Observable();
    }

    return this.crossServiceEventBus.subscribePlayer<T>(playerId, eventType);
  }

  /**
   * 订阅所有事件 (本地)
   */
  onAll(): Observable<IGameEvent> {
    return this.eventBus.asObservable();
  }

  /**
   * 获取事件流(用于业务模块订阅)
   */
  getEventStream(): Observable<IGameEvent> {
    return this.eventBus.asObservable();
  }

  /**
   * 检查是否为跨服务事件类型
   */
  private isCrossServiceEvent(type: string): boolean {
    return Object.values(CrossServiceEventType).includes(type as CrossServiceEventType);
  }
}
