/**
 * 认证控制器
 * 处理登录相关HTTP请求
 */

import { Controller, Post, Body, Get, Headers, UseGuards } from '@nestjs/common';
import { AuthService, ITokenResponse } from './auth.service';
import { JwtAuthGuard } from '../../common/guards';
import { AllowAnonymous } from '../../common/decorators/allow-anonymous.decorator';
import { CurrentPlayerId } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 微信登录
   * 返回 JWT Access Token 和 Refresh Token
   */
  @Post('wechat-login')
  @AllowAnonymous()
  async wechatLogin(
    @Body() dto: { code: string; encryptedData?: string; iv?: string },
  ): Promise<{
    playerId: string;
    tokens: ITokenResponse;
    isNewPlayer: boolean;
  }> {
    return this.authService.wechatLogin(dto.code, dto.encryptedData, dto.iv);
  }

  /**
   * 刷新 Token
   * 使用 Refresh Token 获取新的 Access Token
   */
  @Post('refresh-token')
  @AllowAnonymous()
  async refreshToken(
    @Body('refreshToken') refreshToken: string,
  ): Promise<ITokenResponse> {
    return this.authService.refreshTokens(refreshToken);
  }

  /**
   * 登出
   * 撤销用户的 Refresh Token
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentPlayerId() playerId: string,
    @Body('refreshToken') refreshToken?: string,
  ): Promise<{ success: boolean }> {
    await this.authService.logout(playerId, refreshToken);
    return { success: true };
  }

  // ============================================
  // 向后兼容的 API (已弃用)
  // ============================================

  /**
   * @deprecated 使用 /verify-token 或直接通过 JWT 验证替代
   */
  @Get('verify-session')
  async verifySession(@Headers('x-session-key') sessionKey: string) {
    return this.authService.verifySession(sessionKey);
  }

  /**
   * @deprecated 使用 /refresh-token 替代
   */
  @Post('refresh-session')
  async refreshSession(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshSession(refreshToken);
  }
}
