/**
 * 战斗验证服务
 * 处理流派切换、组队、境界压制等逻辑
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Player, PlayerDocument } from '../../database/schemas/player.schema';
import { RedisService } from '../../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { CombatStyle, Realm } from '../../shared/enums';
import { calculateSuppressedReward, generateId } from '../../shared/utils';

interface IParty {
  id: string;
  leaderId: string;
  memberIds: string[];
  createdAt: number;
}

@Injectable()
export class BattleService {
  private readonly logger = new Logger(BattleService.name);
  private readonly partyCache = new Map<string, IParty>();

  constructor(
    @InjectModel(Player.name)
    private playerModel: Model<PlayerDocument>,
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  /**
   * 切换流派
   * 根据装备实时切换流派
   */
  async switchStyle(playerId: string, style: CombatStyle): Promise<void> {
    const player = await this.playerModel.findById(playerId);
    if (!player) {
      throw new BadRequestException('玩家不存在');
    }

    // 验证当前装备是否支持该流派
    const isValid = this.validateStyleForEquipment(style, player.equipments || []);
    if (!isValid) {
      throw new BadRequestException('当前装备不支持该流派');
    }

    player.currentStyle = style;
    await player.save();

    this.logger.debug(`Player ${playerId} switched to ${style}`);
  }

  /**
   * 获取流派属性
   */
  async getStyleAttributes(playerId: string): Promise<{
    style: CombatStyle;
    attributes: Record<string, number>;
    bonuses: Record<string, number>;
  }> {
    const player = await this.playerModel.findById(playerId);
    if (!player) {
      throw new BadRequestException('玩家不存在');
    }

    const style = (player.currentStyle as CombatStyle) || CombatStyle.SWORD_CULTIVATOR;
    const baseAttributes = player.combatAttributes || {};

    // 计算流派加成
    const bonuses = this.calculateStyleBonuses(style, player.equipments || []);

    return {
      style,
      attributes: baseAttributes as Record<string, number>,
      bonuses,
    };
  }

  /**
   * 创建队伍
   */
  async createParty(leaderId: string): Promise<{ partyId: string }> {
    const party: IParty = {
      id: generateId(),
      leaderId,
      memberIds: [leaderId],
      createdAt: Date.now(),
    };

    this.partyCache.set(party.id, party);

    // 缓存到Redis(10分钟过期)
    await this.redisService.setJson(`party:${party.id}`, party, 600);

    return { partyId: party.id };
  }

  /**
   * 加入队伍
   */
  async joinParty(playerId: string, partyId: string): Promise<void> {
    const partyJson = await this.redisService.getJson<IParty>(`party:${partyId}`);
    if (!partyJson) {
      throw new BadRequestException('队伍不存在');
    }

    const maxPartySize = this.configService.get<number>('combat.maxPartySize') || 4;
    if (partyJson.memberIds.length >= maxPartySize) {
      throw new BadRequestException('队伍已满');
    }

    if (partyJson.memberIds.includes(playerId)) {
      throw new BadRequestException('已在队伍中');
    }

    partyJson.memberIds.push(playerId);
    await this.redisService.setJson(`party:${partyId}`, partyJson, 600);
  }

  /**
   * 离开队伍
   */
  async leaveParty(playerId: string): Promise<void> {
    // 查找玩家所在队伍
    const partyKeys = await this.redisService.getClient().keys('party:*');
    for (const key of partyKeys) {
      const party = await this.redisService.getJson<IParty>(key);
      if (party?.memberIds.includes(playerId)) {
        party.memberIds = party.memberIds.filter((id) => id !== playerId);

        // 如果队伍空了,删除
        if (party.memberIds.length === 0) {
          await this.redisService.del(key);
        } else {
          // 如果队长离开,转移队长
          if (party.leaderId === playerId) {
            party.leaderId = party.memberIds[0];
          }
          await this.redisService.setJson(key, party, 600);
        }
        break;
      }
    }
  }

  /**
   * 检查境界压制
   * 当队伍中有玩家境界高出20%以上时触发天道压制
   */
  async checkRealmSuppression(partyId: string): Promise<{
    hasSuppression: boolean;
    suppressionPenalty: number;
    details: Array<{ playerId: string; realmLevel: number }>;
  }> {
    const party = await this.redisService.getJson<IParty>(`party:${partyId}`);
    if (!party) {
      throw new BadRequestException('队伍不存在');
    }

    // 获取所有队员境界
    const players = await this.playerModel
      .find({ _id: { $in: party.memberIds } })
      .select('realm realmProgress')
      .lean();

    const realmLevels = players.map((p) => ({
      playerId: p._id.toString(),
      realmLevel: this.getRealmLevel(p.realm as Realm, p.realmProgress),
    }));

    const highestLevel = Math.max(...realmLevels.map((r) => r.realmLevel));
    const lowestLevel = Math.min(...realmLevels.map((r) => r.realmLevel));

    const threshold = this.configService.get<number>('combat.realmSuppressionThreshold') || 0.2;
    const hasSuppression = (highestLevel - lowestLevel) / lowestLevel > threshold;

    return {
      hasSuppression,
      suppressionPenalty: hasSuppression ? 0.5 : 0,
      details: realmLevels,
    };
  }

  /**
   * 验证流派与装备匹配
   */
  private validateStyleForEquipment(style: CombatStyle, equipments: any[]): boolean {
    // 简化逻辑:剑修需要装备剑类武器,法修需要法器
    const weapon = equipments.find((e) => e.slot === 'weapon');
    if (!weapon) return false;

    const weaponType = this.getWeaponType(weapon.itemId);

    switch (style) {
      case CombatStyle.SWORD_CULTIVATOR:
        return weaponType === 'sword' || weaponType === 'heavy_sword';
      case CombatStyle.SPELL_CULTIVATOR:
        return weaponType === 'staff' || weaponType === 'orb';
      case CombatStyle.BODY_CULTIVATOR:
        return weaponType === 'fist' || weaponType === 'gauntlet';
      default:
        return true;
    }
  }

  /**
   * 计算流派加成
   */
  private calculateStyleBonuses(style: CombatStyle, equipments: any[]): Record<string, number> {
    const bonuses: Record<string, number> = {};

    switch (style) {
      case CombatStyle.SWORD_CULTIVATOR:
        bonuses.attack = 20;
        bonuses.critRate = 10;
        break;
      case CombatStyle.SPELL_CULTIVATOR:
        bonuses.spellPower = 30;
        bonuses.manaRegen = 15;
        break;
      case CombatStyle.BODY_CULTIVATOR:
        bonuses.hp = 50;
        bonuses.defense = 20;
        break;
    }

    return bonuses;
  }

  /**
   * 获取武器类型
   */
  private getWeaponType(itemId: string): string {
    // 简化实现,实际应从配置表读取
    if (itemId.includes('sword')) return 'sword';
    if (itemId.includes('staff')) return 'staff';
    if (itemId.includes('orb')) return 'orb';
    return 'unknown';
  }

  /**
   * 计算境界等级
   */
  private getRealmLevel(realm: Realm, progress: number): number {
    const realmValues: Record<Realm, number> = {
      [Realm.QI_REFINING]: 1,
      [Realm.FOUNDATION]: 2,
      [Realm.GOLDEN_CORE]: 3,
      [Realm.NASCENT_SOUL]: 4,
      [Realm.SPIRIT_SEVERING]: 5,
      [Realm.VOID_RETURN]: 6,
      [Realm.TRIBULATION]: 7,
      [Realm.TRUE_IMMORTAL]: 8,
    };
    return realmValues[realm] * 100 + progress;
  }
}
