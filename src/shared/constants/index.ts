/**
 * 全局常量定义
 */

// 从共享协议目录导出 (客户端和服务器共用)
export * from '../../../shared/protocol';

// ============================================
// 系统限制常量
// ============================================

/** 离线收益上限(小时) */
export const OFFLINE_REWARD_MAX_HOURS = 12;

/** 离线收益上限(秒) */
export const OFFLINE_REWARD_MAX_SECONDS = OFFLINE_REWARD_MAX_HOURS * 3600;

/** 经脉槽位解锁等级 */
export const MERIDIAN_SLOT_UNLOCK_LEVELS = {
  SLOT_3: 20,   // 第3槽位: 神识20级
  SLOT_4: 50,   // 第4槽位: 神识50级
  SLOT_5: 90,   // 第5槽位: 神识90级
};

/** 九幽幻境道具上限 */
export const DUNGEON_ITEM_LIMITS = {
  GUIDING_TALISMAN: 100,    // 引路符上限
  CONCEALMENT_ARRAY: 4,     // 隐匿阵上限
};

/** 仙府建筑数量 */
export const ESTATE_BUILDING_COUNT = 14;

/** 生产技能数量 */
export const PRODUCTION_SKILL_COUNT = 10;

/** 战斗属性数量 */
export const COMBAT_ATTRIBUTE_COUNT = 8;

// ============================================
// 经济系统常量
// ============================================

/** 交易税率 */
export const TRADE_TAX_RATE = 0.18;

/** 最大赠礼价值(灵石) */
export const MAX_GIFT_VALUE = 10_000_000;

/** 借贷欺诈判定天数 */
export const LOAN_FRAUD_DAYS = 7;

/** 装备强化等级 - 消耗灵石阈值 */
export const ENHANCE_SPIRIT_STONE_THRESHOLD = 10;

// ============================================
// 组队系统常量
// ============================================

/** 境界压制阈值(百分比) */
export const REALM_SUPPRESSION_THRESHOLD = 0.20;

/** 境界压制衰减系数 */
export const REALM_SUPPRESSION_PENALTY = 0.5;

/** 最大队伍人数 */
export const MAX_PARTY_SIZE = 4;

// ============================================
// 效率计算常量
// ============================================

/** 每级技能效率加成(%) */
export const SKILL_EFFICIENCY_PER_LEVEL = 1;

/** 效率上限(%) */
export const MAX_EFFICIENCY_BONUS = 100;

// ============================================
// 缓存Key前缀
// ============================================

export const CACHE_KEYS = {
  PLAYER: 'player:',
  SESSION: 'session:',
  RANKING: 'ranking:',
  AUCTION: 'auction:',
  MARKET: 'market:',
  DUNGEON: 'dungeon:',
  PARTY: 'party:',
  ESTATE: 'estate:',
  LOCK: 'lock:',
};

// ============================================
// 事件名称常量
// ============================================

export const EVENTS = {
  PLAYER_LOGIN: 'player:login',
  PLAYER_LOGOUT: 'player:logout',
  PLAYER_LEVEL_UP: 'player:level_up',
  REALM_BREAKTHROUGH: 'realm:breakthrough',
  ITEM_ACQUIRE: 'item:acquire',
  TRADE_COMPLETE: 'trade:complete',
  BUILDING_COMPLETE: 'building:complete',
  DUNGEON_CLEAR: 'dungeon:clear',
  // 跨服务事件 (用于 HTTP 与 WebSocket 状态同步)
  PLAYER_ATTR_CHANGED: 'player:attr_changed',
  PLAYER_INVENTORY_CHANGED: 'player:inventory_changed',
  PLAYER_CURRENCY_CHANGED: 'player:currency_changed',
  PLAYER_EQUIPMENT_CHANGED: 'player:equipment_changed',
  BATTLE_STARTED: 'battle:started',
  BATTLE_ENDED: 'battle:ended',
  // 示例事件 (扩展模块使用)
  EXAMPLE_EVENT: 'example:event',
};

// ============================================
// Redis Pub/Sub 频道定义
// ============================================

export const PUBSUB_CHANNELS = {
  /** 全局事件频道 */
  GLOBAL: 'game:global:events',
  /** 玩家事件频道前缀 */
  PLAYER_PREFIX: 'game:player:',
  /** 战斗事件频道 */
  BATTLE: 'game:battle:events',
  /** 交易事件频道 */
  TRADE: 'game:trade:events',
  /** 仙府事件频道 */
  ESTATE: 'game:estate:events',
} as const;

/**
 * 获取玩家专属频道名称
 */
export const getPlayerChannel = (playerId: string): string =>
  `${PUBSUB_CHANNELS.PLAYER_PREFIX}${playerId}`;
