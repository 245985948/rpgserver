/**
 * 玩家数据Schema定义
 * 对应玩家数据与状态聚合模块
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Realm, PlayerStatus, CombatAttribute, ProductionSkill } from '../../shared/enums';

export type PlayerDocument = Player & Document;

/**
 * 战斗属性子文档
 */
@Schema({ _id: false })
class CombatAttributes {
  @Prop({ type: Number, default: 1 })
  [CombatAttribute.REALM]: number;

  @Prop({ type: Number, default: 1 })
  [CombatAttribute.PHYSIQUE]: number;

  @Prop({ type: Number, default: 1 })
  [CombatAttribute.SPIRIT]: number;

  @Prop({ type: Number, default: 1 })
  [CombatAttribute.GANG_QI]: number;

  @Prop({ type: Number, default: 1 })
  [CombatAttribute.PROTECTION]: number;

  @Prop({ type: Number, default: 1 })
  [CombatAttribute.SWORD_ART]: number;

  @Prop({ type: Number, default: 1 })
  [CombatAttribute.TELEKINESIS]: number;

  @Prop({ type: Number, default: 1 })
  [CombatAttribute.SPELL]: number;
}

/**
 * 生产技能子文档
 */
@Schema({ _id: false })
class ProductionSkillData {
  @Prop({ type: String, enum: ProductionSkill, required: true })
  type: ProductionSkill;

  @Prop({ type: Number, default: 1 })
  level: number;

  @Prop({ type: Number, default: 0 })
  exp: number;

  @Prop({ type: Number, default: 0 })
  totalProduced: number;
}

/**
 * 装备子文档
 */
@Schema({ _id: false })
class Equipment {
  @Prop({ type: String, required: true })
  itemId: string;

  @Prop({ type: String, required: true })
  slot: string;

  @Prop({ type: Number, default: 0 })
  enhanceLevel: number;

  @Prop({ type: Map, of: Number, default: {} })
  stats: Map<string, number>;
}

/**
 * 货币子文档
 */
@Schema({ _id: false })
class Currency {
  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: Number, default: 0 })
  amount: number;
}

/**
 * 玩家主文档
 */
@Schema({
  timestamps: true,
  collection: 'players',
  toJSON: {
    virtuals: true,
    transform: (doc, ret: Record<string, unknown>) => {
      delete ret._id;
      delete ret.__v;
      delete ret.passwordHash;
      delete ret.passwordSalt;
      return ret;
    },
  },
})
export class Player {
  @Prop({ type: String, unique: true, sparse: true, index: true })
  username?: string;

  @Prop({ type: String, select: false })
  passwordHash?: string;

  @Prop({ type: String, select: false })
  passwordSalt?: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  openId: string;

  @Prop({ type: String, required: true })
  nickname: string;

  @Prop({ type: String })
  avatarUrl?: string;

  @Prop({ type: String, enum: Realm, default: Realm.QI_REFINING })
  realm: Realm;

  @Prop({ type: Number, default: 0 })
  realmProgress: number;

  @Prop({ type: String, enum: PlayerStatus, default: PlayerStatus.OFFLINE })
  status: PlayerStatus;

  // 战斗属性
  @Prop({ type: CombatAttributes, default: () => ({}) })
  combatAttributes: CombatAttributes;

  // 生产技能
  @Prop({ type: [ProductionSkillData], default: [] })
  productionSkills: ProductionSkillData[];

  // 已解锁经脉槽位
  @Prop({ type: Number, default: 2 })
  unlockedMeridianSlots: number;

  // 经脉槽位装备
  @Prop({ type: [String], default: [] })
  equippedArtifacts: string[];

  // 装备
  @Prop({ type: [Equipment], default: [] })
  equipments: Equipment[];

  // 货币
  @Prop({ type: [Currency], default: [] })
  currencies: Currency[];

  // 背包物品
  @Prop({ type: Map, of: Number, default: {} })
  inventory: Map<string, number>;

  // 最后登录时间
  @Prop({ type: Date })
  lastLoginAt?: Date;

  // 最后登出时间
  @Prop({ type: Date })
  lastLogoutAt?: Date;

  // 当前流派
  @Prop({ type: String })
  currentStyle?: string;

  // 离线任务状态(序列化存储)
  @Prop({ type: String })
  offlineTaskState?: string;

  // 统计数据
  @Prop({ type: Map, of: Number, default: {} })
  statistics: Map<string, number>;
}

export const PlayerSchema = SchemaFactory.createForClass(Player);

// 索引
PlayerSchema.index({ status: 1, lastLoginAt: -1 });
PlayerSchema.index({ realm: 1, realmProgress: -1 });
