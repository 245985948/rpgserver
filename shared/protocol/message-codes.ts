/**
 * 消息号定义
 * 客户端 (Cocos Creator) 和服务器 (NestJS) 共用
 *
 * 规则：
 * 1. 消息号按模块分组，每个模块占用 1000 个号段
 * 2. 请求使用偶数，响应对应的请求号 + 1 (奇数)
 * 3. 推送消息使用 900000 以上的号段
 * 4. 错误码使用 1000 以上的号段，按错误类型分组
 *
 * 模块划分：
 * - 000000-000999: 系统级 (心跳、错误、通用)
 * - 001000-001999: 认证模块
 * - 002000-002999: 玩家模块
 * - 003000-003999: 战斗模块
 * - 004000-004999: 经济模块 (交易、拍卖)
 * - 005000-005999: 仙府模块
 * - 006000-006999: 社交模块
 * - 900000-999999: 服务器推送
 */

// ============================================
// 系统级消息 (000000 - 000999)
// ============================================

export const SystemCodes = {
  /** 心跳请求 */
  HEARTBEAT_REQ: 0,
  /** 心跳响应 */
  HEARTBEAT_RESP: 1,
  /** 通用错误响应 */
  ERROR_RESP: 2,
  /** 服务器公告推送 */
  SERVER_NOTICE_PUSH: 3,
  /** 客户端版本检查 */
  VERSION_CHECK_REQ: 4,
  /** 客户端版本检查响应 */
  VERSION_CHECK_RESP: 5,
  /** 服务器时间同步 */
  TIME_SYNC_REQ: 6,
  /** 服务器时间同步响应 */
  TIME_SYNC_RESP: 7,
} as const;

// ============================================
// 认证模块 (001000 - 001999)
// ============================================

export const AuthCodes = {
  /** 微信登录请求 */
  WECHAT_LOGIN_REQ: 1000,
  /** 微信登录响应 */
  WECHAT_LOGIN_RESP: 1001,
  /** Token刷新请求 */
  REFRESH_TOKEN_REQ: 1002,
  /** Token刷新响应 */
  REFRESH_TOKEN_RESP: 1003,
  /** 登出请求 */
  LOGOUT_REQ: 1004,
  /** 登出响应 */
  LOGOUT_RESP: 1005,
  /** 登录状态检查 */
  CHECK_AUTH_REQ: 1006,
  /** 登录状态检查响应 */
  CHECK_AUTH_RESP: 1007,
  /** 账号注册请求 */
  ACCOUNT_REGISTER_REQ: 1010,
  /** 账号注册响应 */
  ACCOUNT_REGISTER_RESP: 1011,
  /** 账号登录请求 */
  ACCOUNT_LOGIN_REQ: 1012,
  /** 账号登录响应 */
  ACCOUNT_LOGIN_RESP: 1013,
} as const;

// ============================================
// 玩家模块 (002000 - 002999)
// ============================================

export const PlayerCodes = {
  /** 获取玩家基础数据 */
  GET_PLAYER_DATA_REQ: 2000,
  /** 获取玩家基础数据响应 */
  GET_PLAYER_DATA_RESP: 2001,
  /** 获取玩家背包 */
  GET_INVENTORY_REQ: 2002,
  /** 获取玩家背包响应 */
  GET_INVENTORY_RESP: 2003,
  /** 获取玩家装备 */
  GET_EQUIPMENT_REQ: 2004,
  /** 获取玩家装备响应 */
  GET_EQUIPMENT_RESP: 2005,
  /** 穿戴装备 */
  EQUIP_ITEM_REQ: 2006,
  /** 穿戴装备响应 */
  EQUIP_ITEM_RESP: 2007,
  /** 卸下装备 */
  UNEQUIP_ITEM_REQ: 2008,
  /** 卸下装备响应 */
  UNEQUIP_ITEM_RESP: 2009,
  /** 使用物品 */
  USE_ITEM_REQ: 2010,
  /** 使用物品响应 */
  USE_ITEM_RESP: 2011,
  /** 丢弃物品 */
  DISCARD_ITEM_REQ: 2012,
  /** 丢弃物品响应 */
  DISCARD_ITEM_RESP: 2013,
  /** 获取离线收益 */
  GET_OFFLINE_REWARD_REQ: 2014,
  /** 获取离线收益响应 */
  GET_OFFLINE_REWARD_RESP: 2015,
  /** 玩家升级 */
  LEVEL_UP_REQ: 2016,
  /** 玩家升级响应 */
  LEVEL_UP_RESP: 2017,
  /** 突破境界 */
  REALM_BREAKTHROUGH_REQ: 2018,
  /** 突破境界响应 */
  REALM_BREAKTHROUGH_RESP: 2019,
} as const;

// ============================================
// 战斗模块 (003000 - 003999)
// ============================================

export const BattleCodes = {
  /** 开始战斗 */
  START_BATTLE_REQ: 3000,
  /** 开始战斗响应 */
  START_BATTLE_RESP: 3001,
  /** 执行战斗动作 */
  BATTLE_ACTION_REQ: 3002,
  /** 执行战斗动作响应 */
  BATTLE_ACTION_RESP: 3003,
  /** 结束战斗 */
  END_BATTLE_REQ: 3004,
  /** 结束战斗响应 */
  END_BATTLE_RESP: 3005,
  /** 获取战斗记录 */
  GET_BATTLE_LOG_REQ: 3006,
  /** 获取战斗记录响应 */
  GET_BATTLE_LOG_RESP: 3007,
  /** 创建队伍 */
  CREATE_PARTY_REQ: 3008,
  /** 创建队伍响应 */
  CREATE_PARTY_RESP: 3009,
  /** 加入队伍 */
  JOIN_PARTY_REQ: 3010,
  /** 加入队伍响应 */
  JOIN_PARTY_RESP: 3011,
  /** 离开队伍 */
  LEAVE_PARTY_REQ: 3012,
  /** 离开队伍响应 */
  LEAVE_PARTY_RESP: 3013,
  /** 设置准备状态 */
  SET_READY_REQ: 3014,
  /** 设置准备状态响应 */
  SET_READY_RESP: 3015,
  /** 开始副本 */
  START_DUNGEON_REQ: 3016,
  /** 开始副本响应 */
  START_DUNGEON_RESP: 3017,
  /** 获取副本列表 */
  GET_DUNGEON_LIST_REQ: 3018,
  /** 获取副本列表响应 */
  GET_DUNGEON_LIST_RESP: 3019,
  /** 挑战首领 */
  CHALLENGE_BOSS_REQ: 3020,
  /** 挑战首领响应 */
  CHALLENGE_BOSS_RESP: 3021,
} as const;

// ============================================
// 经济模块 (004000 - 004999)
// ============================================

export const EconomyCodes = {
  /** 获取市场列表 */
  GET_MARKET_LIST_REQ: 4000,
  /** 获取市场列表响应 */
  GET_MARKET_LIST_RESP: 4001,
  /** 上架物品 */
  LIST_ITEM_REQ: 4002,
  /** 上架物品响应 */
  LIST_ITEM_RESP: 4003,
  /** 购买物品 */
  BUY_ITEM_REQ: 4004,
  /** 购买物品响应 */
  BUY_ITEM_RESP: 4005,
  /** 下架物品 */
  CANCEL_LISTING_REQ: 4006,
  /** 下架物品响应 */
  CANCEL_LISTING_RESP: 4007,
  /** 获取拍卖列表 */
  GET_AUCTION_LIST_REQ: 4008,
  /** 获取拍卖列表响应 */
  GET_AUCTION_LIST_RESP: 4009,
  /** 创建拍卖 */
  CREATE_AUCTION_REQ: 4010,
  /** 创建拍卖响应 */
  CREATE_AUCTION_RESP: 4011,
  /** 出价 */
  PLACE_BID_REQ: 4012,
  /** 出价响应 */
  PLACE_BID_RESP: 4013,
  /** 获取交易记录 */
  GET_TRADE_HISTORY_REQ: 4014,
  /** 获取交易记录响应 */
  GET_TRADE_HISTORY_RESP: 4015,
  /** 赠送物品 */
  GIFT_ITEM_REQ: 4016,
  /** 赠送物品响应 */
  GIFT_ITEM_RESP: 4017,
  /** 获取市场价格 */
  GET_MARKET_PRICE_REQ: 4018,
  /** 获取市场价格响应 */
  GET_MARKET_PRICE_RESP: 4019,
} as const;

// ============================================
// 仙府模块 (005000 - 005999)
// ============================================

export const EstateCodes = {
  /** 获取仙府数据 */
  GET_ESTATE_REQ: 5000,
  /** 获取仙府数据响应 */
  GET_ESTATE_RESP: 5001,
  /** 建造/升级建筑 */
  BUILDING_UPGRADE_REQ: 5002,
  /** 建造/升级建筑响应 */
  BUILDING_UPGRADE_RESP: 5003,
  /** 收获资源 */
  HARVEST_RESOURCE_REQ: 5004,
  /** 收获资源响应 */
  HARVEST_RESOURCE_RESP: 5005,
  /** 访问好友仙府 */
  VISIT_ESTATE_REQ: 5006,
  /** 访问好友仙府响应 */
  VISIT_ESTATE_RESP: 5007,
  /** 协助好友 */
  ASSIST_FRIEND_REQ: 5008,
  /** 协助好友响应 */
  ASSIST_FRIEND_RESP: 5009,
  /** 获取生产队列 */
  GET_PRODUCTION_QUEUE_REQ: 5010,
  /** 获取生产队列响应 */
  GET_PRODUCTION_QUEUE_RESP: 5011,
  /** 开始生产 */
  START_PRODUCTION_REQ: 5012,
  /** 开始生产响应 */
  START_PRODUCTION_RESP: 5013,
} as const;

// ============================================
// 社交模块 (006000 - 006999)
// ============================================

export const SocialCodes = {
  /** 获取好友列表 */
  GET_FRIENDS_REQ: 6000,
  /** 获取好友列表响应 */
  GET_FRIENDS_RESP: 6001,
  /** 添加好友 */
  ADD_FRIEND_REQ: 6002,
  /** 添加好友响应 */
  ADD_FRIEND_RESP: 6003,
  /** 删除好友 */
  REMOVE_FRIEND_REQ: 6004,
  /** 删除好友响应 */
  REMOVE_FRIEND_RESP: 6005,
  /** 发送私聊 */
  PRIVATE_CHAT_REQ: 6006,
  /** 发送私聊响应 */
  PRIVATE_CHAT_RESP: 6007,
  /** 获取聊天记录 */
  GET_CHAT_HISTORY_REQ: 6008,
  /** 获取聊天记录响应 */
  GET_CHAT_HISTORY_RESP: 6009,
  /** 发送邮件 */
  SEND_MAIL_REQ: 6010,
  /** 发送邮件响应 */
  SEND_MAIL_RESP: 6011,
  /** 获取邮件列表 */
  GET_MAIL_LIST_REQ: 6012,
  /** 获取邮件列表响应 */
  GET_MAIL_LIST_RESP: 6013,
  /** 读取邮件 */
  READ_MAIL_REQ: 6014,
  /** 读取邮件响应 */
  READ_MAIL_RESP: 6015,
  /** 领取邮件附件 */
  CLAIM_MAIL_ATTACHMENT_REQ: 6016,
  /** 领取邮件附件响应 */
  CLAIM_MAIL_ATTACHMENT_RESP: 6017,
} as const;

// ============================================
// 服务器推送 (900000 - 999999)
// ============================================

export const ServerPushCodes = {
  /** 玩家数据同步推送 (登录后主动推送) */
  PLAYER_DATA_SYNC: 900100,
  /** 背包数据同步推送 */
  INVENTORY_SYNC: 900101,
  /** 玩家属性变更推送 */
  PLAYER_ATTR_CHANGED: 900000,
  /** 货币变更推送 */
  CURRENCY_CHANGED: 900001,
  /** 物品变更推送 */
  INVENTORY_CHANGED: 900002,
  /** 装备变更推送 */
  EQUIPMENT_CHANGED: 900003,
  /** 等级提升推送 */
  LEVEL_UP_PUSH: 900004,
  /** 境界突破推送 */
  REALM_BREAKTHROUGH_PUSH: 900005,
  /** 战斗开始推送 */
  BATTLE_STARTED: 900010,
  /** 战斗结束推送 */
  BATTLE_ENDED: 900011,
  /** 战斗动作推送 */
  BATTLE_ACTION_PUSH: 900012,
  /** 队伍状态变更 */
  PARTY_STATE_CHANGED: 900020,
  /** 成员加入队伍 */
  PARTY_MEMBER_JOINED: 900021,
  /** 成员离开队伍 */
  PARTY_MEMBER_LEFT: 900022,
  /** 成员准备状态变更 */
  PARTY_MEMBER_READY: 900023,
  /** 收到私聊消息 */
  PRIVATE_MESSAGE_RECEIVED: 900030,
  /** 收到系统邮件 */
  SYSTEM_MAIL_RECEIVED: 900031,
  /** 交易完成通知 */
  TRADE_COMPLETED: 900040,
  /** 拍卖被超越通知 */
  AUCTION_OUTBID: 900041,
  /** 建筑升级完成 */
  BUILDING_UPGRADE_COMPLETE: 900050,
  /** 资源产出可收获 */
  RESOURCE_HARVESTABLE: 900051,
  /** 好友请求 */
  FRIEND_REQUEST_RECEIVED: 900060,
  /** 强制下线通知 */
  FORCE_LOGOUT: 900999,
} as const;

// ============================================
// 错误码 (1000 - 9999)
// ============================================

export const ErrorCodes = {
  // 系统级错误 (1000 - 1999)
  SUCCESS: 0,
  UNKNOWN_ERROR: 1000,
  INVALID_REQUEST: 1001,
  SERVER_MAINTENANCE: 1002,
  RATE_LIMIT_EXCEEDED: 1003,
  VERSION_TOO_OLD: 1004,

  // 认证错误 (2000 - 2999)
  UNAUTHORIZED: 2000,
  TOKEN_EXPIRED: 2001,
  TOKEN_INVALID: 2002,
  TOKEN_REFRESH_FAILED: 2003,
  ALREADY_LOGGED_IN: 2004,
  LOGIN_FAILED: 2005,

  // 玩家数据错误 (3000 - 3999)
  PLAYER_NOT_FOUND: 3000,
  INSUFFICIENT_LEVEL: 3001,
  INSUFFICIENT_REALM: 3002,
  NAME_INVALID: 3003,
  NAME_DUPLICATE: 3004,

  // 背包/物品错误 (4000 - 4999)
  ITEM_NOT_FOUND: 4000,
  INSUFFICIENT_ITEMS: 4001,
  ITEM_CANNOT_USE: 4002,
  INVENTORY_FULL: 4003,
  ITEM_BOUND: 4004,

  // 货币错误 (5000 - 5999)
  INSUFFICIENT_FUNDS: 5000,
  INSUFFICIENT_SPIRIT_STONES: 5001,
  INSUFFICIENT_CONTRIBUTION: 5002,
  INSUFFICIENT_PRESTIGE: 5003,
  INSUFFICIENT_IMMORTAL_JADE: 5004,

  // 战斗错误 (6000 - 6999)
  BATTLE_NOT_FOUND: 6000,
  BATTLE_ALREADY_ENDED: 6001,
  INVALID_BATTLE_ACTION: 6002,
  NOT_IN_BATTLE: 6003,
  DUNGEON_NOT_AVAILABLE: 6004,
  PARTY_NOT_FOUND: 6010,
  PARTY_FULL: 6011,
  PARTY_ALREADY_STARTED: 6012,
  NOT_PARTY_LEADER: 6013,
  MEMBER_NOT_READY: 6014,

  // 经济错误 (7000 - 7999)
  TRADE_NOT_FOUND: 7000,
  TRADE_ALREADY_COMPLETED: 7001,
  CANNOT_BUY_OWN_ITEM: 7002,
  PRICE_INVALID: 7003,
  AUCTION_NOT_FOUND: 7010,
  AUCTION_ALREADY_ENDED: 7011,
  BID_TOO_LOW: 7012,
  AUCTION_RESERVED_PRICE_NOT_MET: 7013,

  // 仙府错误 (8000 - 8999)
  ESTATE_NOT_FOUND: 8000,
  BUILDING_NOT_FOUND: 8001,
  BUILDING_MAX_LEVEL: 8002,
  INSUFFICIENT_MATERIALS: 8003,
  BUILDING_ALREADY_UPGRADING: 8004,
  PRODUCTION_QUEUE_FULL: 8005,

  // 社交错误 (9000 - 9999)
  FRIEND_NOT_FOUND: 9000,
  ALREADY_FRIENDS: 9001,
  FRIEND_REQUEST_PENDING: 9002,
  CANNOT_ADD_SELF: 9003,
  FRIEND_LIST_FULL: 9004,
  MAIL_NOT_FOUND: 9010,
  MAIL_ALREADY_CLAIMED: 9011,
} as const;

// ============================================
// 消息号反向查找 (用于日志)
// ============================================

const allCodes = {
  ...SystemCodes,
  ...AuthCodes,
  ...PlayerCodes,
  ...BattleCodes,
  ...EconomyCodes,
  ...EstateCodes,
  ...SocialCodes,
  ...ServerPushCodes,
  ...ErrorCodes,
};

/**
 * 根据消息号获取消息名称
 */
export function getMessageName(code: number): string {
  const entry = Object.entries(allCodes).find(([, value]) => value === code);
  return entry?.[0] || `UNKNOWN(${code})`;
}

/**
 * 获取消息号所属的模块
 */
export function getMessageModule(code: number): string {
  if (code >= 900000) return 'PUSH';
  if (code >= 6000) return 'SOCIAL';
  if (code >= 5000) return 'ESTATE';
  if (code >= 4000) return 'ECONOMY';
  if (code >= 3000) return 'BATTLE';
  if (code >= 2000) return 'PLAYER';
  if (code >= 1000) return 'AUTH';
  return 'SYSTEM';
}

/**
 * 判断是否为请求消息
 */
export function isRequest(code: number): boolean {
  // 偶数为请求，奇数为响应
  return code % 2 === 0 && code < 900000;
}

/**
 * 判断是否为响应消息
 */
export function isResponse(code: number): boolean {
  // 奇数为响应
  return code % 2 === 1 && code < 900000;
}

/**
 * 判断是否为服务器推送
 */
export function isServerPush(code: number): boolean {
  return code >= 900000;
}

/**
 * 获取响应对应的请求码
 */
export function getRequestCode(responseCode: number): number | null {
  if (!isResponse(responseCode)) return null;
  return responseCode - 1;
}

/**
 * 获取请求对应的响应码
 */
export function getResponseCode(requestCode: number): number | null {
  if (!isRequest(requestCode)) return null;
  return requestCode + 1;
}
