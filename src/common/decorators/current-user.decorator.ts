/**
 * 当前用户装饰器
 * 用于从请求中提取当前登录用户信息
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IAuthenticatedRequest, IAuthenticatedSocket } from '../guards/jwt-auth.guard';

/**
 * 获取当前登录的玩家ID
 * 用于 HTTP 控制器
 * @example
 * @Controller('player')
 * export class PlayerController {
 *   @Get('profile')
 *   getProfile(@CurrentPlayerId() playerId: string) {
 *     return this.playerService.getProfile(playerId);
 *   }
 * }
 */
export const CurrentPlayerId = createParamDecorator(
  (data: unknown, context: ExecutionContext): string => {
    const ctxType = context.getType<'http' | 'ws'>();

    if (ctxType === 'http') {
      const request = context.switchToHttp().getRequest<IAuthenticatedRequest>();
      return request.playerId;
    }

    if (ctxType === 'ws') {
      const client = context.switchToWs().getClient<IAuthenticatedSocket>();
      return client.data.playerId!;
    }

    throw new Error('Unsupported context type');
  },
);

/**
 * 获取当前用户的 OpenId
 */
export const CurrentOpenId = createParamDecorator(
  (data: unknown, context: ExecutionContext): string => {
    const ctxType = context.getType<'http' | 'ws'>();

    if (ctxType === 'http') {
      const request = context.switchToHttp().getRequest<IAuthenticatedRequest>();
      return request.openId;
    }

    if (ctxType === 'ws') {
      const client = context.switchToWs().getClient<IAuthenticatedSocket>();
      return client.data.openId!;
    }

    throw new Error('Unsupported context type');
  },
);

/**
 * 获取完整的 JWT Payload
 */
export const CurrentTokenPayload = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const ctxType = context.getType<'http' | 'ws'>();

    if (ctxType === 'http') {
      const request = context.switchToHttp().getRequest<IAuthenticatedRequest>();
      return request.tokenPayload;
    }

    if (ctxType === 'ws') {
      const client = context.switchToWs().getClient<IAuthenticatedSocket>();
      return client.data.tokenPayload;
    }

    throw new Error('Unsupported context type');
  },
);
