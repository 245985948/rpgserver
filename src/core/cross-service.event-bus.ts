/**
 * 跨服务事件总线
 * 用于 HTTP 服务和 WebSocket 服务之间的状态同步
 * 基于 Redis Pub/Sub 实现
 */

import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { RedisPubSubService, IRedisPubSubMessage } from '../redis/redis-pubsub.service';

/**
 * 跨服务事件类型枚举
 */
export enum CrossServiceEventType {
  // 玩家属性变更
  PLAYER_ATTR_CHANGED = 'player:attr_changed',
  PLAYER_INVENTORY_CHANGED = 'player:inventory_changed',
  PLAYER_CURRENCY_CHANGED = 'player:currency_changed',
  PLAYER_EQUIPMENT_CHANGED = 'player:equipment_changed',
  PLAYER_SKILL_CHANGED = 'player:skill_changed',

  // 战斗相关
  BATTLE_STARTED = 'battle:started',
  BATTLE_ENDED = 'battle:ended',
  BATTLE_DAMAGE = 'battle:damage',

  // 交易相关
  TRADE_COMPLETED = 'trade:completed',
  AUCTION_BID = 'auction:bid',
  MARKET_PRICE_UPDATE = 'market:price_update',

  // 仙府相关
  ESTATE_BUILDING_COMPLETE = 'estate:building_complete',
  ESTATE_VISITOR_ARRIVED = 'estate:visitor_arrived',

  // 社交相关
  FRIEND_REQUEST = 'social:friend_request',
  GUILD_INVITATION = 'social:guild_invitation',

  // 系统通知
  SYSTEM_ANNOUNCEMENT = 'system:announcement',
  SYSTEM_MAINTENANCE = 'system:maintenance',
}

/**
 * 跨服务事件接口
 */
export interface ICrossServiceEvent<T = unknown> {
  type: CrossServiceEventType;
  payload: T;
  playerId?: string;
  timestamp: number;
  senderInstance: string;
}

/**
 * 玩家属性变更 payload
 */
export interface IPlayerAttrChangedPayload {
  playerId: string;
  changes: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  reason: string;
  timestamp: number;
}

/**
 * 货币变更 payload
 */
export interface ICurrencyChangedPayload {
  playerId: string;
  currencyType: string;
  delta: number;
  newValue: number;
  reason: string;
  timestamp: number;
}

/**
 * 物品变更 payload
 */
export interface IInventoryChangedPayload {
  playerId: string;
  itemId: string;
  itemName: string;
  delta: number;
  newQuantity: number;
  reason: string;
  timestamp: number;
}

@Injectable()
export class CrossServiceEventBus {
  private readonly logger = new Logger(CrossServiceEventBus.name);
  private readonly eventSubject = new Subject<ICrossServiceEvent>();

  // 频道命名常量
  private readonly GLOBAL_CHANNEL = 'game:global:events';
  private readonly PLAYER_CHANNEL_PREFIX = 'game:player:';

  constructor(private readonly pubSubService: RedisPubSubService) {
    this.subscribeToGlobalChannel();
  }

  /**
   * 发布事件到全局频道 (所有服务都能收到)
   */
  async publishGlobal<T>(
    eventType: CrossServiceEventType,
    payload: T,
    playerId?: string,
  ): Promise<void> {
    await this.pubSubService.publish(
      this.GLOBAL_CHANNEL,
      eventType,
      payload,
      playerId,
    );

    this.logger.debug(`Published global event: ${eventType}`, { playerId });
  }

  /**
   * 发布事件到玩家专属频道
   */
  async publishToPlayer<T>(
    playerId: string,
    eventType: CrossServiceEventType,
    payload: T,
  ): Promise<void> {
    const channel = `${this.PLAYER_CHANNEL_PREFIX}${playerId}`;
    await this.pubSubService.publish(channel, eventType, payload, playerId);

    this.logger.debug(`Published player event: ${eventType} to ${playerId}`);
  }

  /**
   * 订阅全局事件
   */
  subscribeGlobal<T>(
    eventType: CrossServiceEventType,
  ): Observable<ICrossServiceEvent<T>> {
    return this.eventSubject.pipe(
      filter((event) => event.type === eventType),
      map((event) => event as ICrossServiceEvent<T>),
    );
  }

  /**
   * 订阅特定玩家的事件
   */
  subscribePlayer<T>(
    playerId: string,
    eventType?: CrossServiceEventType,
  ): Observable<ICrossServiceEvent<T>> {
    const channel = `${this.PLAYER_CHANNEL_PREFIX}${playerId}`;

    // 订阅 Redis 频道
    const unsubscribe = this.pubSubService.subscribe(channel, (message) => {
      const event = this.convertToCrossServiceEvent(message);
      if (!eventType || event.type === eventType) {
        this.eventSubject.next(event);
      }
    });

    // 返回 Observable，并在取消订阅时清理
    return this.eventSubject.pipe(
      filter((event) => event.playerId === playerId && (!eventType || event.type === eventType)),
      map((event) => event as ICrossServiceEvent<T>),
    );
  }

  /**
   * 通知玩家属性变更
   * 典型场景：HTTP 服务处理购买后，通知 WebSocket 服务更新战斗状态
   */
  async notifyPlayerAttrChanged(
    playerId: string,
    changes: IPlayerAttrChangedPayload['changes'],
    reason: string,
  ): Promise<void> {
    const payload: IPlayerAttrChangedPayload = {
      playerId,
      changes,
      reason,
      timestamp: Date.now(),
    };

    // 同时发布到全局和玩家专属频道
    await Promise.all([
      this.publishGlobal(CrossServiceEventType.PLAYER_ATTR_CHANGED, payload, playerId),
      this.publishToPlayer(playerId, CrossServiceEventType.PLAYER_ATTR_CHANGED, payload),
    ]);
  }

  /**
   * 通知货币变更
   */
  async notifyCurrencyChanged(
    playerId: string,
    currencyType: string,
    delta: number,
    newValue: number,
    reason: string,
  ): Promise<void> {
    const payload: ICurrencyChangedPayload = {
      playerId,
      currencyType,
      delta,
      newValue,
      reason,
      timestamp: Date.now(),
    };

    await this.publishToPlayer(playerId, CrossServiceEventType.PLAYER_CURRENCY_CHANGED, payload);
  }

  /**
   * 通知物品变更
   */
  async notifyInventoryChanged(
    playerId: string,
    itemId: string,
    itemName: string,
    delta: number,
    newQuantity: number,
    reason: string,
  ): Promise<void> {
    const payload: IInventoryChangedPayload = {
      playerId,
      itemId,
      itemName,
      delta,
      newQuantity,
      reason,
      timestamp: Date.now(),
    };

    await this.publishToPlayer(playerId, CrossServiceEventType.PLAYER_INVENTORY_CHANGED, payload);
  }

  /**
   * 订阅全局频道
   */
  private subscribeToGlobalChannel(): void {
    this.pubSubService.subscribe(this.GLOBAL_CHANNEL, (message) => {
      const event = this.convertToCrossServiceEvent(message);
      this.eventSubject.next(event);
    });
  }

  /**
   * 转换 Redis 消息为跨服务事件
   */
  private convertToCrossServiceEvent(message: IRedisPubSubMessage): ICrossServiceEvent {
    return {
      type: message.event as CrossServiceEventType,
      payload: message.payload,
      playerId: message.targetPlayerId,
      timestamp: message.timestamp,
      senderInstance: message.senderId,
    };
  }
}
