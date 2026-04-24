/**
 * 工具函数集合
 */

import { OFFLINE_REWARD_MAX_SECONDS, SKILL_EFFICIENCY_PER_LEVEL, MAX_EFFICIENCY_BONUS } from '../constants';

// ============================================
// 时间处理工具
// ============================================

/**
 * 获取当前时间戳(秒)
 */
export function now(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * 计算时间差(秒)
 */
export function timeDiff(startTime: Date | number, endTime: Date | number = Date.now()): number {
  const start = startTime instanceof Date ? startTime.getTime() : startTime;
  const end = endTime instanceof Date ? endTime.getTime() : endTime;
  return Math.floor((end - start) / 1000);
}

/**
 * 限制离线收益时长
 */
export function clampOfflineDuration(duration: number): number {
  return Math.min(duration, OFFLINE_REWARD_MAX_SECONDS);
}

// ============================================
// 数值计算工具
// ============================================

/**
 * 计算效率加成后的执行时间
 * @param baseTime 基础执行时间(秒)
 * @param skillLevel 技能等级
 * @param extraBonus 额外加成(%)
 */
export function calculateEfficiencyTime(
  baseTime: number,
  skillLevel: number,
  requiredLevel: number = 1,
  extraBonus: number = 0,
): number {
  const levelDiff = Math.max(0, skillLevel - requiredLevel);
  const efficiencyBonus = Math.min(
    levelDiff * SKILL_EFFICIENCY_PER_LEVEL + extraBonus,
    MAX_EFFICIENCY_BONUS,
  );
  return baseTime * (1 - efficiencyBonus / 100);
}

/**
 * 计算离线收益(统计学期望公式)
 * @param baseRate 基础产出速率(每秒)
 * @param duration 执行时长(秒)
 * @param efficiency 效率加成(%)
 */
export function calculateOfflineReward(
  baseRate: number,
  duration: number,
  efficiency: number,
): { totalAmount: number; effectiveDuration: number } {
  const effectiveDuration = clampOfflineDuration(duration);
  const efficiencyMultiplier = 1 + efficiency / 100;
  const totalAmount = baseRate * effectiveDuration * efficiencyMultiplier;
  return { totalAmount, effectiveDuration };
}

/**
 * 计算交易税
 */
export function calculateTradeTax(amount: number): number {
  return Math.floor(amount * 0.18);
}

/**
 * 计算境界压制后的收益
 */
export function calculateSuppressedReward(
  baseReward: number,
  highestRealmLevel: number,
  playerRealmLevel: number,
): number {
  const realmDiff = (highestRealmLevel - playerRealmLevel) / playerRealmLevel;
  if (realmDiff > 0.2) {
    return Math.floor(baseReward * 0.5);
  }
  return baseReward;
}

// ============================================
// 数据验证工具
// ============================================

/**
 * 验证神识等级是否满足经脉槽位要求
 */
export function validateMeridianSlot(spiritLevel: number, slotIndex: number): boolean {
  const requirements = [0, 0, 20, 50, 90]; // 第1-5槽位的解锁要求
  return spiritLevel >= (requirements[slotIndex] ?? 0);
}

/**
 * 验证交易是否触发风控
 */
export function validateTradeRisk(
  giftValue: number,
  totalReceived: number,
): { isValid: boolean; reason?: string } {
  const MAX_GIFT_VALUE = 10_000_000;
  if (totalReceived + giftValue > MAX_GIFT_VALUE) {
    return {
      isValid: false,
      reason: `接受赠礼总价值不能超过${MAX_GIFT_VALUE}灵石`,
    };
  }
  return { isValid: true };
}

// ============================================
// 数据结构工具
// ============================================

/**
 * 创建物品数量映射
 */
export function createItemMap(items: Array<{ itemId: string; count: number }>): Record<string, number> {
  return items.reduce((map, item) => {
    map[item.itemId] = (map[item.itemId] ?? 0) + item.count;
    return map;
  }, {} as Record<string, number>);
}

/**
 * 合并物品列表
 */
export function mergeItemLists(
  ...lists: Array<Array<{ itemId: string; count: number }>>
): Array<{ itemId: string; count: number }> {
  const merged = new Map<string, number>();
  for (const list of lists) {
    for (const item of list) {
      merged.set(item.itemId, (merged.get(item.itemId) ?? 0) + item.count);
    }
  }
  return Array.from(merged.entries()).map(([itemId, count]) => ({ itemId, count }));
}

// ============================================
// ID生成工具
// ============================================

/**
 * 生成唯一ID(简化版,生产环境建议使用更健壮的方案)
 */
export function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 生成玩家ID
 */
export function generatePlayerId(openId: string): string {
  return `p_${Buffer.from(openId).toString('base64url').substring(0, 16)}_${Date.now().toString(36)}`;
}
