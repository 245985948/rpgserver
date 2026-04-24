/**
 * 允许匿名访问装饰器
 * 用于标记不需要 JWT 认证的方法
 *
 * 使用场景:
 * 1. 登录接口本身
 * 2. 测试环境的特定接口
 * 3. 公开访问的接口
 *
 * 示例:
 * @Controller('public')
 * export class PublicController {
 *   @Get('info')
 *   @AllowAnonymous()
 *   getInfo() {
 *     return { version: '1.0.0' };
 *   }
 * }
 */

import { SetMetadata } from '@nestjs/common';

export const ALLOW_ANONYMOUS_KEY = 'allowAnonymous';

/**
 * 允许匿名访问
 */
export const AllowAnonymous = () => SetMetadata(ALLOW_ANONYMOUS_KEY, true);
