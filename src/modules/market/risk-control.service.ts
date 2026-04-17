/**
 * 风险控制服务
 * 处理防黑产、财富转移限制、借贷欺诈检测
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Trade, TradeDocument } from '../../database/schemas/trade.schema';
import { RedisService } from '../../redis/redis.service';
import { MAX_GIFT_VALUE, CACHE_KEYS } from '../../shared/constants';
import { CurrencyType } from '../../shared/enums';

interface IRiskProfile {
  playerId: string;
  totalReceivedGifts: number;
  recentTransactions: Array<{
    targetId: string;
    amount: number;
    timestamp: number;
  }>;
  riskScore: number;
  flags: string[];
}

@Injectable()
export class RiskControlService {
  private readonly logger = new Logger(RiskControlService.name);

  constructor(
    @InjectModel(Trade.name)
    private tradeModel: Model<TradeDocument>,
    private redisService: RedisService,
  ) {}

  /**
   * 验证交易是否违规
   * 限制财富转移(接受赠礼总价值不得超过10M灵石)
   */
  async validateTrade(
    fromPlayerId: string,
    toPlayerId: string,
    amount: number,
  ): Promise<{ isValid: boolean; reason?: string; riskScore: number }> {
    const riskProfile = await this.getRiskProfile(toPlayerId);

    // 检查赠礼总额
    if (riskProfile.totalReceivedGifts + amount > MAX_GIFT_VALUE) {
      return {
        isValid: false,
        reason: `接受赠礼总价值不能超过${MAX_GIFT_VALUE}灵石`,
        riskScore: 100,
      };
    }

    // 检查异常交易模式
    const abnormalPattern = this.detectAbnormalPattern(riskProfile);
    if (abnormalPattern.isAbnormal) {
      return {
        isValid: false,
        reason: abnormalPattern.reason,
        riskScore: 80,
      };
    }

    // 计算风险分数
    const riskScore = this.calculateRiskScore(riskProfile, amount);

    return {
      isValid: riskScore < 70,
      riskScore,
    };
  }

  /**
   * 记录赠礼
   */
  async recordGift(
    fromPlayerId: string,
    toPlayerId: string,
    amount: number,
  ): Promise<void> {
    const cacheKey = `${CACHE_KEYS.PLAYER}${toPlayerId}:gifts`;

    const currentTotal = parseInt((await this.redisService.get(cacheKey)) || '0');
    await this.redisService.set(
      cacheKey,
      (currentTotal + amount).toString(),
      86400 * 30, // 30天过期
    );

    // 记录交易
    await this.tradeModel.create({
      sellerId: new Types.ObjectId(fromPlayerId),
      buyerId: new Types.ObjectId(toPlayerId),
      itemId: 'gift',
      itemCount: 1,
      price: amount,
      currencyType: CurrencyType.SPIRIT_STONE,
      tax: 0,
      tradeType: 'gift',
      isCompleted: true,
      completedAt: new Date(),
      isFlagged: amount > 1000000, // 大额标记
    });

    this.logger.debug(`Gift recorded: ${fromPlayerId} -> ${toPlayerId}, amount: ${amount}`);
  }

  /**
   * 记录借贷
   * 7天内未偿还视为欺诈
   */
  async recordLoan(
    lenderId: string,
    borrowerId: string,
    amount: number,
    dueDays: number = 7,
  ): Promise<void> {
    const loanId = `loan_${Date.now()}`;
    const loanData = {
      loanId,
      lenderId,
      borrowerId,
      amount,
      createdAt: Date.now(),
      dueAt: Date.now() + dueDays * 24 * 60 * 60 * 1000,
      status: 'active',
    };

    await this.redisService.setJson(
      `${CACHE_KEYS.PLAYER}${borrowerId}:loan:${loanId}`,
      loanData,
      dueDays * 86400,
    );

    this.logger.debug(`Loan recorded: ${loanId}, due in ${dueDays} days`);
  }

  /**
   * 检查逾期借贷
   */
  async checkOverdueLoans(playerId: string): Promise<{
    hasOverdue: boolean;
    overdueAmount: number;
    fraudDetected: boolean;
  }> {
    const pattern = `${CACHE_KEYS.PLAYER}${playerId}:loan:*`;
    const loanKeys = await this.redisService.getClient().keys(pattern);

    let overdueAmount = 0;
    let hasOverdue = false;

    for (const key of loanKeys) {
      const loan = await this.redisService.getJson<any>(key);
      if (loan && loan.status === 'active' && loan.dueAt < Date.now()) {
        hasOverdue = true;
        overdueAmount += loan.amount;
      }
    }

    return {
      hasOverdue,
      overdueAmount,
      fraudDetected: hasOverdue, // 标记为欺诈
    };
  }

  /**
   * 标记可疑账户
   */
  async flagAccount(
    playerId: string,
    reason: string,
    severity: 'low' | 'medium' | 'high' = 'medium',
  ): Promise<void> {
    await this.redisService.hset(
      `${CACHE_KEYS.PLAYER}${playerId}:flags`,
      Date.now().toString(),
      JSON.stringify({ reason, severity, timestamp: Date.now() }),
    );

    this.logger.warn(`Account flagged: ${playerId}, reason: ${reason}, severity: ${severity}`);
  }

  /**
   * 获取风险档案
   */
  private async getRiskProfile(playerId: string): Promise<IRiskProfile> {
    const giftsTotal = parseInt(
      (await this.redisService.get(`${CACHE_KEYS.PLAYER}${playerId}:gifts`)) || '0',
    );

    // 获取近期交易
    const recentTrades = await this.tradeModel
      .find({
        $or: [
          { sellerId: new Types.ObjectId(playerId) },
          { buyerId: new Types.ObjectId(playerId) },
        ],
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const flags = await this.redisService.hgetall(
      `${CACHE_KEYS.PLAYER}${playerId}:flags`,
    );

    return {
      playerId,
      totalReceivedGifts: giftsTotal,
      recentTransactions: recentTrades.map((t) => ({
        targetId:
          t.sellerId.toString() === playerId
            ? t.buyerId?.toString() || ''
            : t.sellerId.toString(),
        amount: t.price,
        timestamp: new Date(t.createdAt).getTime(),
      })),
      riskScore: Object.keys(flags).length * 20,
      flags: Object.values(flags).map((v) => JSON.parse(v).reason),
    };
  }

  /**
   * 检测异常交易模式
   */
  private detectAbnormalPattern(profile: IRiskProfile): {
    isAbnormal: boolean;
    reason?: string;
  } {
    // 短时间内大量交易
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentCount = profile.recentTransactions.filter(
      (t) => t.timestamp > oneHourAgo,
    ).length;

    if (recentCount > 20) {
      return { isAbnormal: true, reason: '短时间内交易过于频繁' };
    }

    // 与多个不同账户交易
    const uniqueTargets = new Set(
      profile.recentTransactions.map((t) => t.targetId),
    );
    if (uniqueTargets.size > 10) {
      return { isAbnormal: true, reason: '与过多不同账户有交易往来' };
    }

    return { isAbnormal: false };
  }

  /**
   * 计算风险分数
   */
  private calculateRiskScore(profile: IRiskProfile, currentAmount: number): number {
    let score = profile.riskScore;

    // 基于赠礼总额加分
    score += (profile.totalReceivedGifts / MAX_GIFT_VALUE) * 30;

    // 大额交易加分
    if (currentAmount > 1000000) score += 20;
    if (currentAmount > 5000000) score += 30;

    return Math.min(score, 100);
  }
}
