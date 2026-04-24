/**
 * 游戏逻辑配置
 */

import {
  OFFLINE_REWARD_MAX_HOURS,
  TRADE_TAX_RATE,
  MAX_GIFT_VALUE,
  REALM_SUPPRESSION_THRESHOLD,
} from '../shared/constants';

export default () => ({
  // 离线收益配置
  offline: {
    maxHours: OFFLINE_REWARD_MAX_HOURS,
    maxSeconds: OFFLINE_REWARD_MAX_HOURS * 3600,
    checkInterval: 60, // 检查间隔(秒)
  },

  // 经济系统配置
  economy: {
    tradeTaxRate: TRADE_TAX_RATE,
    maxGiftValue: MAX_GIFT_VALUE,
    loanFraudDays: 7,
    enhanceCostThreshold: 10, // 强化+10开始消耗灵石
  },

  // 战斗系统配置
  combat: {
    realmSuppressionThreshold: REALM_SUPPRESSION_THRESHOLD,
    maxPartySize: 4,
    baseCritRate: 0.05,
    baseCritDamage: 1.5,
  },

  // 仙府配置
  estate: {
    maxBuildings: 14,
    baseConstructionTime: 3600, // 基础建造时间(秒)
    stealCooldown: 3600, // 偷取冷却(秒)
    assistBonus: 0.2, // 协助加速比例
  },

  // 秘境配置
  dungeon: {
    maxGuidingTalisman: 100,
    maxConcealmentArray: 4,
    baseFloors: 100,
  },

  // 玩家配置
  player: {
    maxSkills: 18, // 10生产 + 8战斗
    initialInventorySlots: 50,
  },
});
