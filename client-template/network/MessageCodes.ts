/**
 * 消息号定义
 * 与服务器共用，确保两边一致
 */

// 消息号前缀定义
export enum MessagePrefix {
  SYSTEM = 1000,
  AUTH = 2000,
  PLAYER = 3000,
  BATTLE = 4000,
  ECONOMY = 5000,
  ESTATE = 6000,
  SOCIAL = 7000,
  PUSH = 8000,
}

// 系统消息 (1000-1099)
export const SystemCodes = {
  HEARTBEAT_REQ: 1001,
  HEARTBEAT_RESP: 1002,
  TIME_SYNC_REQ: 1003,
  TIME_SYNC_RESP: 1004,
  ERROR_NOTIFY: 1005,
} as const;

// 认证消息 (2000-2099)
export const AuthCodes = {
  WECHAT_LOGIN_REQ: 2001,
  WECHAT_LOGIN_RESP: 2002,
  LOGOUT_REQ: 2003,
  LOGOUT_RESP: 2004,
  TOKEN_REFRESH_REQ: 2005,
  TOKEN_REFRESH_RESP: 2006,
} as const;

// 玩家消息 (3000-3099)
export const PlayerCodes = {
  GET_PLAYER_DATA_REQ: 3001,
  GET_PLAYER_DATA_RESP: 3002,
  UPDATE_NICKNAME_REQ: 3003,
  UPDATE_NICKNAME_RESP: 3004,
  USE_ITEM_REQ: 3005,
  USE_ITEM_RESP: 3006,
  LEVEL_UP_REQ: 3007,
  LEVEL_UP_RESP: 3008,
} as const;

// 战斗消息 (4000-4099)
export const BattleCodes = {
  ENTER_DUNGEON_REQ: 4001,
  ENTER_DUNGEON_RESP: 4002,
  BATTLE_ACTION_REQ: 4003,
  BATTLE_ACTION_RESP: 4004,
  BATTLE_STATE_NOTIFY: 4005,
  BATTLE_END_NOTIFY: 4006,
} as const;

// 经济消息 (5000-5099)
export const EconomyCodes = {
  GET_MARKET_LIST_REQ: 5001,
  GET_MARKET_LIST_RESP: 5002,
  BUY_ITEM_REQ: 5003,
  BUY_ITEM_RESP: 5004,
  SELL_ITEM_REQ: 5005,
  SELL_ITEM_RESP: 5006,
  GET_AUCTION_LIST_REQ: 5007,
  GET_AUCTION_LIST_RESP: 5008,
  BID_REQ: 5009,
  BID_RESP: 5010,
} as const;

// 仙府消息 (6000-6099)
export const EstateCodes = {
  GET_ESTATE_DATA_REQ: 6001,
  GET_ESTATE_DATA_RESP: 6002,
  UPGRADE_BUILDING_REQ: 6003,
  UPGRADE_BUILDING_RESP: 6004,
  COLLECT_SPIRIT_REQ: 6005,
  COLLECT_SPIRIT_RESP: 6006,
} as const;

// 推送消息 (8000-8099)
export const PushCodes = {
  PLAYER_ATTR_CHANGED: 8001,
  CURRENCY_CHANGED: 8002,
  INVENTORY_CHANGED: 8003,
  SYSTEM_NOTICE: 8004,
  NEW_MAIL: 8005,
} as const;

// 错误码
export const ErrorCodes = {
  SUCCESS: 0,
  UNKNOWN_ERROR: -1,
  INVALID_PARAMS: -2,
  UNAUTHORIZED: -3,
  FORBIDDEN: -4,
  NOT_FOUND: -5,
  SERVER_ERROR: -6,
  TIMEOUT: -7,
  RATE_LIMITED: -8,
} as const;

/**
 * 获取消息名称
 */
export function getMessageName(code: number): string {
  const allCodes = {
    ...SystemCodes,
    ...AuthCodes,
    ...PlayerCodes,
    ...BattleCodes,
    ...EconomyCodes,
    ...EstateCodes,
    ...PushCodes,
  };

  for (const [name, value] of Object.entries(allCodes)) {
    if (value === code) {
      return name;
    }
  }
  return `UNKNOWN(${code})`;
}

/**
 * 获取响应码
 */
export function getResponseCode(requestCode: number): number | null {
  // 请求码通常是奇数，响应码是请求码+1
  return requestCode + 1;
}

/**
 * 判断是否为请求消息
 */
export function isRequest(code: number): boolean {
  // 推送消息以 8 开头
  if (code >= 8000 && code < 9000) {
    return false;
  }
  // 奇数为请求，偶数为响应
  return code % 2 === 1;
}
