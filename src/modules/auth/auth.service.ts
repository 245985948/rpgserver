/**
 * 认证服务
 * 处理微信登录验证和 JWT 令牌管理
 */

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
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
  ): Promise<{
    playerId: string;
    tokens: ITokenResponse;
    isNewPlayer: boolean;
  }> {
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

    return {
      playerId,
      tokens,
      isNewPlayer,
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
