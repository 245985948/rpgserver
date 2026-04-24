/**
 * 核心接口定义
 * 包含所有模块共享的数据结构
 */

import { Realm, CombatAttribute, ProductionSkill, CombatStyle, CurrencyType, EquipmentSlot, BuildingType, PlayerStatus, DungeonItem } from '../enums';

// ============================================
// 基础实体接口
// ============================================

/** 基础数据库实体 */
export interface IBaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/** 玩家基础数据 */
export interface IPlayerBase extends IBaseEntity {
  openId: string;           // 微信openid
  nickname: string;         // 昵称
  avatarUrl?: string;       // 头像
  realm: Realm;             // 当前境界
  realmProgress: number;    // 境界进度
  status: PlayerStatus;     // 在线状态
  lastLoginAt: Date;        // 最后登录时间
  lastLogoutAt: Date;       // 最后登出时间
}

// ============================================
// 战斗系统接口
// ============================================

/** 战斗属性数据 */
export interface ICombatAttributes {
  [CombatAttribute.REALM]: number;
  [CombatAttribute.PHYSIQUE]: number;
  [CombatAttribute.SPIRIT]: number;
  [CombatAttribute.GANG_QI]: number;
  [CombatAttribute.PROTECTION]: number;
  [CombatAttribute.SWORD_ART]: number;
  [CombatAttribute.TELEKINESIS]: number;
  [CombatAttribute.SPELL]: number;
}

/** 经脉槽位数据 */
export interface IMeridianSlots {
  unlockedSlots: number;    // 已解锁槽位数 (3-5个)
  equippedArtifacts: string[]; // 装备的法宝ID列表
}

/** 装备数据 */
export interface IEquipment {
  id: string;
  itemId: string;           // 配置表ID
  slot: EquipmentSlot;
  enhanceLevel: number;     // 强化等级
  stats: Record<string, number>;
}

// ============================================
// 生产系统接口
// ============================================

/** 生产技能数据 */
export interface IProductionSkillData {
  type: ProductionSkill;
  level: number;
  exp: number;
  totalProduced: number;    // 累计产出数量
}

/** 离线收益任务 */
export interface IOfflineTask {
  skillType: ProductionSkill;
  startTime: Date;
  duration: number;         // 计划执行时长(秒)
  efficiency: number;       // 效率加成(%)
}

/** 离线收益结果 */
export interface IOfflineReward {
  task: IOfflineTask;
  actualDuration: number;   // 实际执行时长(受上限限制)
  rewards: IRewardItem[];
  expGain: number;
}

// ============================================
// 经济系统接口
// ============================================

/** 货币数据 */
export interface ICurrency {
  type: CurrencyType;
  amount: number;
}

/** 奖励物品 */
export interface IRewardItem {
  itemId: string;
  count: number;
  quality?: number;         // 品质
}

/** 交易记录 */
export interface ITradeRecord extends IBaseEntity {
  sellerId: string;
  buyerId: string;
  itemId: string;
  itemCount: number;
  price: number;
  currencyType: CurrencyType;
  tax: number;              // 交易税
  tradeType: string;
}

// ============================================
// 仙府系统接口
// ============================================

/** 仙府建筑数据 */
export interface IBuilding {
  type: BuildingType;
  level: number;
  buildProgress: number;    // 建造进度
  isConstructing: boolean;
  boostEndTime?: Date;      // 加速结束时间
}

/** 仙府数据 */
export interface IEstate extends IBaseEntity {
  playerId: string;
  buildings: IBuilding[];
  spiritGatheringRate: number;  // 灵气聚集速率
  visitorLogs: IVisitorLog[];   // 访客记录
}

/** 访客记录 */
export interface IVisitorLog {
  visitorId: string;
  visitTime: Date;
  action: 'steal' | 'assist';
  targetBuilding?: BuildingType;
}

// ============================================
// 秘境系统接口
// ============================================

/** 九幽幻境数据 */
export interface IDungeonState {
  playerId: string;
  currentFloor: number;     // 当前层数
  maxFloor: number;         // 历史最高层
  items: Record<DungeonItem, number>; // 持有道具
  activeArrays: number;     // 已激活隐匿阵数量
  isActive: boolean;        // 是否在进行中
}

/** 组队数据 */
export interface IParty {
  id: string;
  leaderId: string;
  memberIds: string[];
  dungeonId?: string;
  createdAt: Date;
}

// ============================================
// 配置表接口
// ============================================

/** 技能配置 */
export interface ISkillConfig {
  id: string;
  name: string;
  type: ProductionSkill | CombatAttribute;
  maxLevel: number;
  expTable: number[];       // 每级所需经验
  baseTime: number;         // 基础执行时间(秒)
  unlockRequirements?: Record<string, number>;
}

/** 物品配置 */
export interface IItemConfig {
  id: string;
  name: string;
  type: string;
  quality: number;
  stackable: boolean;
  maxStack: number;
  attributes?: Record<string, number>;
}

// ============================================
// 网络通信接口
// ============================================

/** WebSocket消息 */
export interface IWSMessage<T = unknown> {
  event: string;
  data: T;
  timestamp: number;
  seq: number;              // 序列号用于断线重连
}

/** HTTP响应包装 */
export interface IApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

/** 分页请求 */
export interface IPaginationQuery {
  page: number;
  pageSize: number;
}

/** 分页响应 */
export interface IPaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
