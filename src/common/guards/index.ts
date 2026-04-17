/**
 * 全局守卫
 */

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Socket } from 'socket.io';

// 导出 JWT 守卫
export {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  IJwtPayload,
  IAuthenticatedRequest,
  IAuthenticatedSocket,
} from './jwt-auth.guard';

// 导出装饰器
export { AllowAnonymous, ALLOW_ANONYMOUS_KEY } from '../decorators/allow-anonymous.decorator';

/**
 * 认证守卫 (旧版 - 已弃用)
 * 基于简单的 x-player-id Header 验证
 * @deprecated 请使用 JwtAuthGuard 替代
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const playerId = request.headers['x-player-id'];

    if (!playerId) {
      throw new UnauthorizedException('缺少玩家认证信息');
    }

    // 将playerId附加到请求对象供后续使用
    request.playerId = playerId;
    this.logger.warn('AuthGuard is deprecated, please use JwtAuthGuard instead');
    return true;
  }
}

/**
 * 版本守卫
 * 验证客户端版本兼容性
 */
@Injectable()
export class VersionGuard implements CanActivate {
  private readonly minVersion = '1.0.0';

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const clientVersion = request.headers['x-client-version'];

    if (!clientVersion) {
      throw new UnauthorizedException('缺少客户端版本号');
    }

    // 简化的版本比较,实际可能需要更复杂的逻辑
    if (clientVersion < this.minVersion) {
      throw new UnauthorizedException('客户端版本过低,请更新');
    }

    return true;
  }
}
