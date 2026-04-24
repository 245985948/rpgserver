/**
 * 认证服务
 * 处理微信登录、账号密码登录和 JWT 令牌管理
 */

import { Injectable, Logger, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Player, PlayerDocument } from '../../database/schemas/player.schema';
import { RedisService } from '../../redis/redis.service';
import { now } from '../../shared/utils';
import { CACHE_KEYS } from '../../shared/constants';

/**
 * JWT 配置常量
 */
const JWT_CONFIG = {
  /** Access Token 过期时间 (2小时) */
  ACCESS_TOKEN_EXPIRY: '2h',
  /** Refresh Token 过期时间 (7天) */
  REFRESH_TOKEN_EXPIRY: '7d',
  /** Access Token 过期秒数 */
  ACCESS_TOKEN_EXPIRY_SECONDS: 7200,
  /** Refresh Token 过期秒数 */
  REFRESH_TOKEN_EXPIRY_SECONDS: 604800,
} as const;

/**
 * JWT Payload 接口
 */
export interface ITokenPayload {
  playerId: string;
  openId: string;
  type: 'access' | 'refresh';
  /** JWT 签发时间 */
  iat?: number;
  /** JWT 过期时间 */
  exp?: number;
}

/**
 * Token 响应接口
 */
export interface ITokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

/**
 * 玩家基础信息接口
 */
export interface IPlayerBasicInfo {
  id: string;
  nickname: string;
  avatar: string;
  level: number;
  exp: number;
  realm: string;
  vipLevel: number;
  fightingPower: number;
}

/**
 * 玩家货币接口
 */
export interface IPlayerCurrency {
  spiritStones: number;
  contribution: number;
  prestige: number;
  immortalJade: number;
}

/**
 * 玩家战斗属性接口
 */
export interface IPlayerAttributes {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  critRate: number;
  critDamage: number;
  resistance: number;
}

/**
 * 玩家完整数据接口
 */
export interface IPlayerData {
  basic: IPlayerBasicInfo;
  currency: IPlayerCurrency;
  attributes: IPlayerAttributes;
  skills: string[];
  equipments: unknown[];
  items: unknown[];
  lastUpdate: number;
}

/**
 * 登录响应接口
 */
export interface ILoginResponse {
  playerId: string;
  tokens: ITokenResponse;
  isNewPlayer: boolean;
  playerData: IPlayerData;
  inventory: Record<string, number>;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(Player.name)
    private playerModel: Model<PlayerDocument>,
    private redisService: RedisService,
    private jwtService: JwtService,
  ) {}

  /**
   * 微信登录
   * 简化实现,实际应调用微信API验证code
   */
  async wechatLogin(
    code: string,
    encryptedData?: string,
    iv?: string,
  ): Promise<ILoginResponse> {
    // 模拟调用微信API获取openId
    // 实际应调用 https://api.weixin.qq.com/sns/jscode2session
    const openId = this.mockGetOpenId(code);

    // 查找或创建玩家
    let player = await this.playerModel.findOne({ openId });
    let isNewPlayer = false;

    if (!player) {
      // 创建新玩家
      isNewPlayer = true;
      player = await this.playerModel.create({
        openId,
        nickname: `道友_${openId.substring(0, 6)}`,
        status: 'online',
        lastLoginAt: new Date(),
      });

      this.logger.log(`New player created: ${player._id}`);
    } else {
      // 更新登录时间
      player.status = 'online' as any;
      player.lastLoginAt = new Date();
      await player.save();
    }

    const playerId = player._id.toString();

    // 生成 JWT Tokens
    const tokens = await this.generateTokens(playerId, openId);

    // 存储 Refresh Token 到 Redis (用于撤销)
    await this.storeRefreshToken(playerId, tokens.refreshToken);

    this.logger.debug(`Player ${playerId} logged in with JWT`);

    // 构建玩家数据和背包
    const playerData = this.buildPlayerData(player);
    const inventory = this.getInventory(player);

    return {
      playerId,
      tokens,
      isNewPlayer,
      playerData,
      inventory,
    };
  }

  /**
   * 账号注册
   * 使用用户名和密码创建新账号
   */
  async accountRegister(
    username: string,
    password: string,
  ): Promise<ILoginResponse> {
    // 验证用户名格式
    if (!username || username.length < 3 || username.length > 20) {
      throw new ConflictException('用户名长度必须在3-20个字符之间');
    }

    // 验证密码格式
    if (!password || password.length < 6 || password.length > 32) {
      throw new ConflictException('密码长度必须在6-32个字符之间');
    }

    // 检查用户名是否已存在
    const existingPlayer = await this.playerModel.findOne({ username }).select('+passwordHash');
    if (existingPlayer) {
      throw new ConflictException('用户名已存在');
    }

    // 生成密码盐并加密密码
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 创建新玩家
    const player = await this.playerModel.create({
      username,
      passwordHash,
      passwordSalt: salt,
      openId: `account_${username}_${Date.now()}`,
      nickname: `道友_${username.substring(0, 6)}`,
      status: 'online',
      lastLoginAt: new Date(),
    });

    this.logger.log(`New account registered: ${player._id}, username: ${username}`);

    const playerId = player._id.toString();

    // 生成 JWT Tokens
    const tokens = await this.generateTokens(playerId, player.openId);

    // 存储 Refresh Token 到 Redis
    await this.storeRefreshToken(playerId, tokens.refreshToken);

    // 构建玩家数据和背包
    const playerData = this.buildPlayerData(player);
    const inventory = this.getInventory(player);

    return {
      playerId,
      tokens,
      isNewPlayer: true,
      playerData,
      inventory,
    };
  }

  /**
   * 账号密码登录
   * 使用用户名和密码登录
   */
  async accountLogin(
    username: string,
    password: string,
  ): Promise<ILoginResponse> {
    // 查找玩家（包含密码字段）
    const player = await this.playerModel
      .findOne({ username })
      .select('+passwordHash +passwordSalt');

    if (!player) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, player.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 更新登录状态
    player.status = 'online' as any;
    player.lastLoginAt = new Date();
    await player.save();

    const playerId = player._id.toString();

    // 生成 JWT Tokens
    const tokens = await this.generateTokens(playerId, player.openId);

    // 存储 Refresh Token 到 Redis
    await this.storeRefreshToken(playerId, tokens.refreshToken);

    this.logger.debug(`Player ${playerId} logged in with account: ${username}`);

    // 构建玩家数据和背包
    const playerData = this.buildPlayerData(player);
    const inventory = this.getInventory(player);

    return {
      playerId,
      tokens,
      isNewPlayer: false,
      playerData,
      inventory,
    };
  }

  /**
   * 刷新 Access Token
   * 使用 Refresh Token 获取新的 Access Token
   */
  async refreshTokens(refreshToken: string): Promise<ITokenResponse> {
    try {
      // 验证 Refresh Token
      const payload = await this.jwtService.verifyAsync<ITokenPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的令牌类型');
      }

      // 检查 Refresh Token 是否在 Redis 中存在 (是否被撤销)
      const storedToken = await this.redisService.get(
        `${CACHE_KEYS.SESSION}${payload.playerId}:refresh`,
      );

      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException('刷新令牌已失效');
      }

      // 生成新的 Tokens
      const tokens = await this.generateTokens(payload.playerId, payload.openId);

      // 撤销旧的 Refresh Token，存储新的
      await this.storeRefreshToken(payload.playerId, tokens.refreshToken);

      this.logger.debug(`Tokens refreshed for player ${payload.playerId}`);

      return tokens;
    } catch (error) {
      this.logger.warn(`Token refresh failed: ${error.message}`);
      throw new UnauthorizedException('无效的刷新令牌');
    }
  }

  /**
   * 验证 Access Token
   * 用于中间件或守卫验证
   */
  async verifyAccessToken(token: string): Promise<ITokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<ITokenPayload>(token);

      if (payload.type !== 'access') {
        throw new UnauthorizedException('无效的令牌类型');
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException('无效的访问令牌');
    }
  }

  /**
   * 登出
   * 撤销用户的 Refresh Token
   */
  async logout(playerId: string, refreshToken?: string): Promise<void> {
    // 删除 Redis 中的 Refresh Token
    await this.redisService.del(`${CACHE_KEYS.SESSION}${playerId}:refresh`);

    // 将 Refresh Token 加入黑名单 (如果提供)
    if (refreshToken) {
      try {
        const payload = await this.jwtService.decode(refreshToken) as ITokenPayload;
        if (payload?.exp) {
          const ttl = payload.exp - Math.floor(Date.now() / 1000);
          if (ttl > 0) {
            await this.redisService.set(
              `${CACHE_KEYS.SESSION}blacklist:${refreshToken}`,
              '1',
              ttl,
            );
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to blacklist token: ${error.message}`);
      }
    }

    // 更新玩家状态为离线
    await this.playerModel.updateOne(
      { _id: playerId },
      { status: 'offline' },
    );

    this.logger.debug(`Player ${playerId} logged out`);
  }

  /**
   * 生成 JWT Tokens
   */
  private async generateTokens(playerId: string, openId: string): Promise<ITokenResponse> {
    const accessTokenPayload: ITokenPayload = {
      playerId,
      openId,
      type: 'access',
    };

    const refreshTokenPayload: ITokenPayload = {
      playerId,
      openId,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessTokenPayload, {
        expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
      }),
      this.jwtService.signAsync(refreshTokenPayload, {
        expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY,
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY_SECONDS,
      tokenType: 'Bearer',
    };
  }

  /**
   * 存储 Refresh Token 到 Redis
   */
  private async storeRefreshToken(playerId: string, refreshToken: string): Promise<void> {
    await this.redisService.set(
      `${CACHE_KEYS.SESSION}${playerId}:refresh`,
      refreshToken,
      JWT_CONFIG.REFRESH_TOKEN_EXPIRY_SECONDS,
    );
  }

  /**
   * 模拟获取OpenId
   * 实际应调用微信API
   */
  private mockGetOpenId(code: string): string {
    // 简化实现,实际应调用微信服务器
    return `openid_${code.substring(0, 16)}`;
  }

  /**
   * 根据玩家文档构建玩家数据
   */
  private buildPlayerData(player: PlayerDocument): IPlayerData {
    // 计算战力（简单累加战斗属性）
    const combatAttrs = player.combatAttributes || {};
    const combatValues = Object.values(combatAttrs as Record<string, number>);
    const fightingPower = combatValues.reduce((sum, val) => sum + (val || 0), 0) * 10;

    // 获取货币
    const currencies = player.currencies || [];
    const currencyMap: Record<string, number> = {};
    currencies.forEach((c: { type: string; amount: number }) => {
      currencyMap[c.type] = c.amount;
    });

    return {
      basic: {
        id: player._id.toString(),
        nickname: player.nickname,
        avatar: player.avatarUrl || '',
        level: combatAttrs['realm'] || 1,
        exp: 0,
        realm: player.realm || 'QI_REFINING',
        vipLevel: 0,
        fightingPower,
      },
      currency: {
        spiritStones: currencyMap['spirit_stones'] || 0,
        contribution: currencyMap['contribution'] || 0,
        prestige: currencyMap['prestige'] || 0,
        immortalJade: currencyMap['immortal_jade'] || 0,
      },
      attributes: {
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        attack: combatAttrs['attack'] || 10,
        defense: combatAttrs['defense'] || 10,
        speed: combatAttrs['speed'] || 10,
        critRate: 5,
        critDamage: 150,
        resistance: 0,
      },
      skills: [],
      equipments: player.equipments || [],
      items: this.buildInventoryItems(player),
      lastUpdate: Date.now(),
    };
  }

  /**
   * 获取玩家的背包数据
   */
  private getInventory(player: PlayerDocument): Record<string, number> {
    const inventoryMap: Record<string, number> = {};
    if (player.inventory && player.inventory instanceof Map) {
      player.inventory.forEach((value, key) => {
        inventoryMap[key] = value;
      });
    }
    return inventoryMap;
  }

  /**
   * 构建背包物品列表（用于 playerData.items）
   */
  private buildInventoryItems(player: PlayerDocument): Array<{ itemId: string; quantity: number }> {
    const items: Array<{ itemId: string; quantity: number }> = [];
    if (player.inventory && player.inventory instanceof Map) {
      player.inventory.forEach((quantity, itemId) => {
        items.push({ itemId, quantity });
      });
    }
    return items;
  }

  // ============================================
  // 向后兼容的方法 (已弃用)
  // ============================================

  /**
   * @deprecated 使用 verifyAccessToken 替代
   */
  async verifySession(sessionKey: string): Promise<{
    valid: boolean;
    playerId?: string;
    expiresIn?: number;
  }> {
    this.logger.warn('verifySession is deprecated, use verifyAccessToken instead');
    try {
      const payload = await this.verifyAccessToken(sessionKey);
      return {
        valid: true,
        playerId: payload.playerId,
        expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY_SECONDS,
      };
    } catch {
      return { valid: false };
    }
  }

  /**
   * @deprecated 使用 refreshTokens 替代
   */
  async refreshSession(refreshToken: string): Promise<{
    sessionKey: string;
    expiresIn: number;
  }> {
    this.logger.warn('refreshSession is deprecated, use refreshTokens instead');
    const tokens = await this.refreshTokens(refreshToken);
    return {
      sessionKey: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };
  }
}
