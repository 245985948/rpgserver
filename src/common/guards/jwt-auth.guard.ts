/**
 * JWT 认证守卫
 * 统一处理 HTTP 和 WebSocket 的 JWT 认证
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Socket } from 'socket.io';
import { ALLOW_ANONYMOUS_KEY } from '../decorators/allow-anonymous.decorator';

/**
 * JWT Payload 接口
 */
export interface IJwtPayload {
  /** 玩家ID */
  playerId: string;
  /** 微信openid */
  openId: string;
  /** 会话类型 */
  type: 'access' | 'refresh';
  /** 签发时间 */
  iat: number;
  /** 过期时间 */
  exp: number;
}

/**
 * 扩展的 Request 类型
 */
export interface IAuthenticatedRequest extends Request {
  playerId: string;
  openId: string;
  tokenPayload: IJwtPayload;
}

/**
 * 扩展的 Socket 类型
 */
export interface IAuthenticatedSocket extends Socket {
  data: {
    playerId?: string;
    openId?: string;
    tokenPayload?: IJwtPayload;
    [key: string]: unknown;
  };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * 验证入口
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查是否允许匿名访问
    const isAnonymousAllowed = this.reflector.getAllAndOverride<boolean>(
      ALLOW_ANONYMOUS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isAnonymousAllowed) {
      // 允许匿名，但如果有 token 仍尝试解析
      return this.tryAuthenticate(context);
    }

    const contextType = context.getType<'http' | 'ws'>();

    if (contextType === 'http') {
      return this.validateHttp(context);
    } else if (contextType === 'ws') {
      return this.validateWebSocket(context);
    }

    throw new UnauthorizedException('不支持的上下文类型');
  }

  /**
   * 尝试认证（可选）
   */
  private async tryAuthenticate(context: ExecutionContext): Promise<boolean> {
    const contextType = context.getType<'http' | 'ws'>();

    try {
      if (contextType === 'http') {
        await this.validateHttp(context);
      } else if (contextType === 'ws') {
        await this.validateWebSocket(context);
      }
    } catch {
      // 可选认证，失败不阻止
    }

    return true;
  }

  /**
   * 验证 HTTP 请求
   * 从 Header Authorization: Bearer <token> 中提取
   */
  private async validateHttp(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<IAuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('缺少访问令牌');
    }

    try {
      const payload = await this.jwtService.verifyAsync<IJwtPayload>(token);

      // 检查 token 类型
      if (payload.type !== 'access') {
        throw new UnauthorizedException('无效的令牌类型');
      }

      // 将用户信息附加到请求对象
      request.playerId = payload.playerId;
      request.openId = payload.openId;
      request.tokenPayload = payload;

      return true;
    } catch (error) {
      this.logger.warn(`HTTP JWT validation failed: ${error.message}`);
      throw new UnauthorizedException('无效的访问令牌');
    }
  }

  /**
   * 验证 WebSocket 连接
   * 从连接查询参数 ws://url?token=<token> 中提取
   */
  private async validateWebSocket(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<IAuthenticatedSocket>();
    const token = this.extractTokenFromSocket(client);

    if (!token) {
      this.logger.warn('WebSocket connection rejected: missing token');
      // WebSocket 不能直接抛出 HTTP 异常，需要断开连接
      client.disconnect(true);
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync<IJwtPayload>(token);

      if (payload.type !== 'access') {
        this.logger.warn('WebSocket connection rejected: invalid token type');
        client.disconnect(true);
        return false;
      }

      // 将用户信息附加到 socket data
      client.data.playerId = payload.playerId;
      client.data.openId = payload.openId;
      client.data.tokenPayload = payload;

      this.logger.debug(`WebSocket authenticated: player ${payload.playerId}`);
      return true;
    } catch (error) {
      this.logger.warn(`WebSocket JWT validation failed: ${error.message}`);
      client.disconnect(true);
      return false;
    }
  }

  /**
   * 从 HTTP Header 提取 Token
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }

  /**
   * 从 WebSocket 连接中提取 Token
   * 支持 query.token 和 auth.token 两种方式
   */
  private extractTokenFromSocket(client: IAuthenticatedSocket): string | undefined {
    // 方式1: 从 handshake.query 获取 (ws://url?token=xxx)
    const queryToken = client.handshake.query.token;
    if (queryToken) {
      return Array.isArray(queryToken) ? queryToken[0] : queryToken;
    }

    // 方式2: 从 handshake.auth 获取 (Socket.IO v3+ 的认证方式)
    const authToken = client.handshake.auth?.token;
    if (authToken) {
      return authToken;
    }

    // 方式3: 从 handshake.headers.authorization 获取
    const headerAuth = client.handshake.headers.authorization;
    if (headerAuth) {
      const [type, token] = headerAuth.split(' ');
      if (type === 'Bearer' && token) {
        return token;
      }
    }

    return undefined;
  }
}

/**
 * 可选的 JWT 守卫
 * 用于不需要强制登录的接口，但如果有 token 会解析用户信息
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(OptionalJwtAuthGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const contextType = context.getType<'http' | 'ws'>();

    if (contextType === 'http') {
      return this.validateHttpOptional(context);
    }

    return true;
  }

  private async validateHttpOptional(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<IAuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync<IJwtPayload>(token);
        request.playerId = payload.playerId;
        request.openId = payload.openId;
        request.tokenPayload = payload;
      } catch (error) {
        // 可选认证，失败不阻止请求
        this.logger.debug(`Optional JWT validation failed: ${error.message}`);
      }
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) return undefined;

    return token;
  }
}
