/**
 * 游戏协议类型定义
 * 客户端 (Cocos Creator) 和服务器 (NestJS) 共用
 */

// ============================================
// 基础类型
// ============================================

/** 消息序列号 */
export type SequenceNumber = number;

/** 消息码 */
export type MessageCode = number;

/** 错误码 */
export type ErrorCode = number;

/** 玩家ID */
export type PlayerId = string;

/** 物品ID */
export type ItemId = string;

/** 时间戳 (毫秒) */
export type Timestamp = number;

// ============================================
// 消息接口
// ============================================

/**
 * 请求消息基类
 */
export interface IRequestMessage<T = unknown> {
  /** 消息号 */
  code: MessageCode;
  /** 序列号 */
  seq: SequenceNumber;
  /** 消息体 */
  payload: T;
  /** 客户端时间戳 */
  timestamp: Timestamp;
  /** 协议版本 (可选) */
  version?: string;
}

/**
 * 响应消息基类
 */
export interface IResponseMessage<T = unknown> {
  /** 消息号 */
  code: MessageCode;
  /** 序列号 (与请求相同) */
  seq: SequenceNumber;
  /** 响应数据 */
  payload: T;
  /** 错误信息 (如果有) */
  error?: IErrorInfo;
  /** 服务器时间戳 */
  timestamp: Timestamp;
  /** 处理耗时(ms) */
  processingTime?: number;
}

/**
 * 错误信息
 */
export interface IErrorInfo {
  /** 错误码 */
  code: ErrorCode;
  /** 错误消息 */
  message: string;
  /** 详细错误信息 (调试用) */
  detail?: string;
}

/**
 * 服务器推送消息
 */
export interface IPushMessage<T = unknown> {
  /** 消息号 */
  code: MessageCode;
  /** 推送数据 */
  payload: T;
  /** 推送时间戳 */
  timestamp: Timestamp;
}

// ============================================
// 认证模块类型
// ============================================

/**
 * 微信登录请求
 * Code: 1000
 */
export interface IWechatLoginReq {
  /** 微信登录 code */
  code: string;
  /** 加密数据 (可选) */
  encryptedData?: string;
  /** 加密 IV (可选) */
  iv?: string;
  /** 设备信息 */
  deviceInfo?: {
    platform: string;
    version: string;
    deviceId?: string;
  };
}

/**
 * 微信登录响应
 * Code: 1001
 */
export interface IWechatLoginResp {
  /** 玩家ID */
  playerId: PlayerId;
  /** Token 信息 */
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
  };
  /** 是否新玩家 */
  isNewPlayer: boolean;
  /** 玩家基础数据 */
  playerData?: IPlayerBasicInfo;
}

/**
 * Token 刷新请求
 * Code: 1002
 */
export interface IRefreshTokenReq {
  refreshToken: string;
}

/**
 * Token 刷新响应
 * Code: 1003
 */
export interface IRefreshTokenResp {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ============================================
// 玩家模块类型
// ============================================

/**
 * 玩家基础信息
 */
export interface IPlayerBasicInfo {
  id: PlayerId;
  nickname: string;
  avatar?: string;
  level: number;
  exp: number;
  realm: string; // 境界
  vipLevel: number;
  fightingPower: number;
}

/**
 * 玩家货币
 */
export interface IPlayerCurrency {
  spiritStones: number;  // 灵石
  contribution: number;  // 贡献点
  prestige: number;      // 声望
  immortalJade: number;  // 仙玉
}

/**
 * 玩家属性
 */
export interface IPlayerAttributes {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  critRate: number;
  critDamage: number;
}

/**
 * 获取玩家数据请求
 * Code: 2000
 */
export interface IGetPlayerDataReq {
  /** 指定玩家ID (空则获取自己) */
  targetPlayerId?: PlayerId;
}

/**
 * 获取玩家数据响应
 * Code: 2001
 */
export interface IGetPlayerDataResp {
  basic: IPlayerBasicInfo;
  currency: IPlayerCurrency;
  attributes: IPlayerAttributes;
}

/**
 * 物品信息
 */
export interface IItemInfo {
  id: ItemId;
  itemId: string;      // 配置表ID
  name: string;
  quantity: number;
  quality: number;
  icon?: string;
  desc?: string;
}

/**
 * 使用物品请求
 * Code: 2004
 */
export interface IUseItemReq {
  itemId: ItemId;
  quantity: number;
  /** 使用目标 (某些物品需要) */
  targetId?: string;
}

/**
 * 使用物品响应
 * Code: 2005
 */
export interface IUseItemResp {
  success: boolean;
  itemId: ItemId;
  used: number;
  /** 使用效果 */
  effects?: Array<{
    type: string;
    value: number;
  }>;
  /** 剩余数量 */
  remaining: number;
}

// ============================================
// 战斗模块类型
// ============================================

/**
 * 战斗单位
 */
export interface IBattleUnit {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  isPlayer: boolean;
  avatar?: string;
}

/**
 * 开始战斗请求
 * Code: 3000
 */
export interface IStartBattleReq {
  /** 战斗类型 */
  battleType: 'pve' | 'pvp' | 'dungeon';
  /** 目标ID (怪物ID/玩家ID/副本ID) */
  targetId: string;
  /** 是否组队 */
  isParty?: boolean;
  partyId?: string;
}

/**
 * 开始战斗响应
 * Code: 3001
 */
export interface IStartBattleResp {
  battleId: string;
  units: IBattleUnit[];
  /** 战斗状态 */
  state: 'preparing' | 'fighting' | 'ended';
}

/**
 * 战斗动作
 */
export interface IBattleAction {
  actorId: string;
  targetId: string;
  actionType: 'attack' | 'skill' | 'item' | 'escape';
  skillId?: string;
  itemId?: string;
  damage?: number;
  isCrit?: boolean;
  heal?: number;
}

/**
 * 执行战斗动作请求
 * Code: 3002
 */
export interface IBattleActionReq {
  battleId: string;
  action: IBattleAction;
}

/**
 * 执行战斗动作响应
 * Code: 3003
 */
export interface IBattleActionResp {
  success: boolean;
  battleId: string;
  /** 动作结果 */
  result: IBattleAction;
  /** 战斗是否结束 */
  battleEnded: boolean;
  /** 胜者ID */
  winner?: string;
}

// ============================================
// 经济模块类型
// ============================================

/**
 * 市场物品
 */
export interface IMarketItem {
  tradeId: string;
  sellerId: PlayerId;
  sellerName: string;
  item: IItemInfo;
  price: number;
  listTime: Timestamp;
  expireTime: Timestamp;
}

/**
 * 获取市场列表请求
 * Code: 4000
 */
export interface IGetMarketListReq {
  /** 物品类型筛选 */
  itemType?: string;
  /** 品质筛选 */
  quality?: number;
  /** 最低等级 */
  minLevel?: number;
  /** 最高等级 */
  maxLevel?: number;
  /** 排序方式 */
  sortBy?: 'price' | 'time' | 'level';
  /** 升序/降序 */
  sortOrder?: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

/**
 * 获取市场列表响应
 * Code: 4001
 */
export interface IGetMarketListResp {
  items: IMarketItem[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 购买物品请求
 * Code: 4004
 */
export interface IBuyItemReq {
  tradeId: string;
  quantity?: number;
}

/**
 * 购买物品响应
 * Code: 4005
 */
export interface IBuyItemResp {
  success: boolean;
  tradeId: string;
  item: IItemInfo;
  totalPrice: number;
  /** 交易后的余额 */
  newBalance: number;
}

// ============================================
// 服务器推送类型
// ============================================

/**
 * 玩家属性变更推送
 * Code: 900000
 */
export interface IPlayerAttrChangedPush {
  changes: Array<{
    field: string;
    oldValue: number | string | boolean;
    newValue: number | string | boolean;
  }>;
  reason: string;
}

/**
 * 货币变更推送
 * Code: 900001
 */
export interface ICurrencyChangedPush {
  currencyType: 'spiritStones' | 'contribution' | 'prestige' | 'immortalJade';
  delta: number;
  newValue: number;
  reason: string;
}

/**
 * 背包变更推送
 * Code: 900002
 */
export interface IInventoryChangedPush {
  itemId: ItemId;
  itemName: string;
  delta: number;
  newQuantity: number;
  reason: string;
}

/**
 * 战斗开始推送
 * Code: 900010
 */
export interface IBattleStartedPush {
  battleId: string;
  battleType: string;
  units: IBattleUnit[];
}

/**
 * 战斗结束推送
 * Code: 900011
 */
export interface IBattleEndedPush {
  battleId: string;
  winner: string;
  /** 奖励 */
  rewards?: {
    exp?: number;
    items?: IItemInfo[];
  };
}

// ============================================
// 消息类型映射 (用于类型推导)
// ============================================

import {
  SystemCodes,
  AuthCodes,
  PlayerCodes,
  BattleCodes,
  EconomyCodes,
  ServerPushCodes,
} from './message-codes';

/**
 * 请求消息类型映射
 */
export interface IRequestMap {
  [SystemCodes.HEARTBEAT_REQ]: {};
  [AuthCodes.WECHAT_LOGIN_REQ]: IWechatLoginReq;
  [AuthCodes.REFRESH_TOKEN_REQ]: IRefreshTokenReq;
  [PlayerCodes.GET_PLAYER_DATA_REQ]: IGetPlayerDataReq;
  [PlayerCodes.USE_ITEM_REQ]: IUseItemReq;
  [BattleCodes.START_BATTLE_REQ]: IStartBattleReq;
  [BattleCodes.BATTLE_ACTION_REQ]: IBattleActionReq;
  [EconomyCodes.GET_MARKET_LIST_REQ]: IGetMarketListReq;
  [EconomyCodes.BUY_ITEM_REQ]: IBuyItemReq;
}

/**
 * 响应消息类型映射
 */
export interface IResponseMap {
  [SystemCodes.HEARTBEAT_RESP]: { serverTime: Timestamp };
  [AuthCodes.WECHAT_LOGIN_RESP]: IWechatLoginResp;
  [AuthCodes.REFRESH_TOKEN_RESP]: IRefreshTokenResp;
  [PlayerCodes.GET_PLAYER_DATA_RESP]: IGetPlayerDataResp;
  [PlayerCodes.USE_ITEM_RESP]: IUseItemResp;
  [BattleCodes.START_BATTLE_RESP]: IStartBattleResp;
  [BattleCodes.BATTLE_ACTION_RESP]: IBattleActionResp;
  [EconomyCodes.GET_MARKET_LIST_RESP]: IGetMarketListResp;
  [EconomyCodes.BUY_ITEM_RESP]: IBuyItemResp;
}

/**
 * 推送消息类型映射
 */
export interface IPushMap {
  [ServerPushCodes.PLAYER_ATTR_CHANGED]: IPlayerAttrChangedPush;
  [ServerPushCodes.CURRENCY_CHANGED]: ICurrencyChangedPush;
  [ServerPushCodes.INVENTORY_CHANGED]: IInventoryChangedPush;
  [ServerPushCodes.BATTLE_STARTED]: IBattleStartedPush;
  [ServerPushCodes.BATTLE_ENDED]: IBattleEndedPush;
}
