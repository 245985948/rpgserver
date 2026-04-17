/**
 * Protobuf 序列化服务
 * 提供数据的 Protobuf 编码/解码功能
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as protobuf from 'protobufjs';
import * as path from 'path';

/**
 * 序列化选项
 */
export interface IProtobufOptions {
  /** 是否压缩 (使用 gzip) */
  compress?: boolean;
  /** 是否验证数据 */
  verify?: boolean;
}

/**
 * Protobuf 消息类型缓存
 */
interface IMessageTypeCache {
  [key: string]: protobuf.Type;
}

@Injectable()
export class ProtobufService implements OnModuleInit {
  private readonly logger = new Logger(ProtobufService.name);
  private root: protobuf.Root | null = null;
  private messageCache: IMessageTypeCache = {};

  /** 默认的 proto 文件路径 */
  private readonly protoPath = path.join(__dirname, '../proto/game.proto');

  async onModuleInit(): Promise<void> {
    await this.loadProto();
  }

  /**
   * 加载 Proto 文件
   */
  private async loadProto(): Promise<void> {
    try {
      this.root = await protobuf.load(this.protoPath);
      this.logger.log(`Protobuf loaded from ${this.protoPath}`);
    } catch (error) {
      this.logger.error('Failed to load protobuf:', error);
      // 不抛出错误，允许服务继续运行 (降级到 JSON)
    }
  }

  /**
   * 获取消息类型
   */
  private getMessageType(messageName: string): protobuf.Type | null {
    // 检查缓存
    if (this.messageCache[messageName]) {
      return this.messageCache[messageName];
    }

    if (!this.root) {
      this.logger.warn('Protobuf root not loaded');
      return null;
    }

    try {
      const messageType = this.root.lookupType(messageName);
      this.messageCache[messageName] = messageType;
      return messageType;
    } catch (error) {
      this.logger.error(`Message type ${messageName} not found:`, error);
      return null;
    }
  }

  /**
   * 将对象编码为 Protobuf Buffer
   * @param messageName 消息类型名 (如 'taixu.PlayerData')
   * @param data 要编码的数据
   * @returns 编码后的 Buffer，失败返回 null
   */
  encode<T extends object>(messageName: string, data: T): Buffer | null {
    const messageType = this.getMessageType(messageName);
    if (!messageType) {
      return null;
    }

    try {
      // 验证数据
      const errMsg = messageType.verify(data);
      if (errMsg) {
        this.logger.warn(`Protobuf verify failed for ${messageName}: ${errMsg}`);
        // 继续编码，不阻止
      }

      // 创建消息实例并编码
      const message = messageType.create(data);
      const buffer = messageType.encode(message).finish();

      return Buffer.from(buffer);
    } catch (error) {
      this.logger.error(`Protobuf encode failed for ${messageName}:`, error);
      return null;
    }
  }

  /**
   * 将 Protobuf Buffer 解码为对象
   * @param messageName 消息类型名
   * @param buffer 要解码的 Buffer
   * @returns 解码后的对象，失败返回 null
   */
  decode<T extends object>(messageName: string, buffer: Buffer | Uint8Array): T | null {
    const messageType = this.getMessageType(messageName);
    if (!messageType) {
      return null;
    }

    try {
      const message = messageType.decode(buffer);
      return messageType.toObject(message, {
        longs: String,
        enums: String,
        bytes: String,
        defaults: true,
      }) as T;
    } catch (error) {
      this.logger.error(`Protobuf decode failed for ${messageName}:`, error);
      return null;
    }
  }

  /**
   * 尝试使用 Protobuf 编码，失败则返回 JSON Buffer
   * @param messageName 首选的 Protobuf 消息类型
   * @param data 要编码的数据
   * @returns 编码结果
   */
  encodeSafe<T extends object>(messageName: string, data: T): { buffer: Buffer; isProtobuf: boolean } {
    const pbBuffer = this.encode(messageName, data);
    if (pbBuffer) {
      return { buffer: pbBuffer, isProtobuf: true };
    }

    // 降级到 JSON
    try {
      const jsonBuffer = Buffer.from(JSON.stringify(data));
      return { buffer: jsonBuffer, isProtobuf: false };
    } catch (error) {
      this.logger.error('JSON encode failed:', error);
      throw new Error('Failed to encode data');
    }
  }

  /**
   * 尝试使用 Protobuf 解码，失败则尝试 JSON
   * @param messageName 首选的 Protobuf 消息类型
   * @param buffer 要解码的 Buffer
   * @param isProtobuf 是否确定为 Protobuf 格式
   * @returns 解码结果
   */
  decodeSafe<T extends object>(
    messageName: string,
    buffer: Buffer | Uint8Array,
    isProtobuf = true,
  ): T | null {
    if (isProtobuf) {
      const result = this.decode<T>(messageName, buffer);
      if (result) return result;
    }

    // 尝试 JSON 解码
    try {
      return JSON.parse(buffer.toString()) as T;
    } catch {
      return null;
    }
  }

  /**
   * 比较 Protobuf 和 JSON 的编码大小
   * 用于调试和监控
   */
  compareSize<T extends object>(messageName: string, data: T): {
    protobuf: number;
    json: number;
    savings: number;
    savingsPercent: number;
  } {
    const pbBuffer = this.encode(messageName, data);
    const jsonBuffer = Buffer.from(JSON.stringify(data));

    const pbSize = pbBuffer?.length || 0;
    const jsonSize = jsonBuffer.length;
    const savings = jsonSize - pbSize;
    const savingsPercent = jsonSize > 0 ? (savings / jsonSize) * 100 : 0;

    return {
      protobuf: pbSize,
      json: jsonSize,
      savings,
      savingsPercent: Math.round(savingsPercent * 100) / 100,
    };
  }

  /**
   * 检查是否支持指定的消息类型
   */
  supports(messageName: string): boolean {
    return this.getMessageType(messageName) !== null;
  }
}

/**
 * 预定义的消息类型名 (对应 game.proto 中的定义)
 */
export const ProtobufMessageTypes = {
  // 基础
  EMPTY: 'taixu.Empty',
  ERROR_INFO: 'taixu.ErrorInfo',
  GAME_REQUEST: 'taixu.GameRequest',
  GAME_RESPONSE: 'taixu.GameResponse',
  WEBSOCKET_MESSAGE: 'taixu.WebSocketMessage',

  // 玩家
  PLAYER_BASIC_INFO: 'taixu.PlayerBasicInfo',
  PLAYER_CURRENCY: 'taixu.PlayerCurrency',
  PLAYER_ATTRIBUTES: 'taixu.PlayerAttributes',
  PLAYER_DATA: 'taixu.PlayerData',

  // 物品
  ITEM: 'taixu.Item',
  EQUIPMENT: 'taixu.Equipment',
  ATTRIBUTE_BONUS: 'taixu.AttributeBonus',

  // 战斗
  BATTLE_UNIT: 'taixu.BattleUnit',
  BATTLE_ACTION: 'taixu.BattleAction',
  BATTLE_EFFECT: 'taixu.BattleEffect',
  BATTLE_STATE: 'taixu.BattleState',

  // 经济
  MARKET_LISTING: 'taixu.MarketListing',
  AUCTION_ITEM: 'taixu.AuctionItem',
  BID_RECORD: 'taixu.BidRecord',

  // 仙府
  ESTATE_BUILDING: 'taixu.EstateBuilding',
  ESTATE_DATA: 'taixu.EstateData',

  // 同步
  ATTR_CHANGE_NOTIFY: 'taixu.AttrChangeNotify',
  ATTR_CHANGE: 'taixu.AttrChange',
  CURRENCY_CHANGE_NOTIFY: 'taixu.CurrencyChangeNotify',
  INVENTORY_CHANGE_NOTIFY: 'taixu.InventoryChangeNotify',

  // 登录
  LOGIN_REQUEST: 'taixu.LoginRequest',
  LOGIN_RESPONSE: 'taixu.LoginResponse',
} as const;
