/**
 * 全局类型定义
 */

// ============================================
// 基础类型别名
// ============================================

/** 实体ID类型 */
export type EntityId = string;

/** 时间戳类型(毫秒) */
export type Timestamp = number;

/** 配置表ID类型 */
export type ConfigId = string;

// ============================================
// 通用工具类型
// ============================================

/** 可空类型 */
export type Nullable<T> = T | null;

/** 可选字段类型 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** 必填字段类型 */
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** 深度Partial */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ============================================
// 业务相关类型
// ============================================

/** 玩家ID集合 */
export type PlayerIdSet = Set<EntityId>;

/** 属性加成映射 */
export type AttributeBonus = Record<string, number>;

/** 物品数量映射 */
export type ItemCountMap = Record<ConfigId, number>;

/** 技能等级映射 */
export type SkillLevelMap = Record<string, number>;

// ============================================
// 函数类型定义
// ============================================

/** 奖励计算函数 */
export type RewardCalculator = (duration: number, efficiency: number) => {
  items: Array<{ itemId: string; count: number }>;
  exp: number;
};

/** 属性验证函数 */
export type AttributeValidator = (value: number, requirements: Record<string, number>) => boolean;

/** 异步任务处理器 */
export type AsyncTaskHandler<T = unknown, R = unknown> = (data: T) => Promise<R>;

// ============================================
// 配置相关类型
// ============================================

/** 配置表数据类型 */
export type ConfigData = Record<ConfigId, unknown>;

/** 配置加载器类型 */
export type ConfigLoader<T> = () => Promise<Record<ConfigId, T>>;

// ============================================
// 网络相关类型
// ============================================

/** 客户端平台类型 */
export type ClientPlatform = 'wechat_minigame' | 'android' | 'ios' | 'web';

/** 请求上下文 */
export type RequestContext = {
  playerId: EntityId;
  openId: string;
  platform: ClientPlatform;
  version: string;
  timestamp: Timestamp;
};

/** Socket房间类型 */
export type SocketRoom = `player:${EntityId}` | `party:${EntityId}` | 'global';
