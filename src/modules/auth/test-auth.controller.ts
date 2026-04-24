/**
 * 测试环境认证控制器
 * 提供免 token 的测试接口
 * 注意：此控制器仅在测试/开发环境启用
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllowAnonymous } from '../../common/decorators/allow-anonymous.decorator';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';

@Controller('test-auth')
@AllowAnonymous() // 整个控制器允许匿名访问
export class TestAuthController {
  private readonly logger = new Logger(TestAuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 检查是否为测试环境
   */
  private isTestEnvironment(): boolean {
    const env = this.configService.get('nodeEnv', 'development');
    return ['development', 'test', 'dev'].includes(env);
  }

  /**
   * 快速生成测试用的 JWT Token
   * 仅限测试环境使用
   *
   * GET /api/test-auth/quick-token?playerId=123&nickname=测试玩家
   */
  @Get('quick-token')
  async generateTestToken(
    @Query('playerId') playerId?: string,
    @Query('nickname') nickname?: string,
    @Query('level') level?: string,
  ) {
    // 安全检查：生产环境禁用
    if (!this.isTestEnvironment()) {
      throw new UnauthorizedException('此接口仅在测试环境可用');
    }

    // 生成随机的测试玩家ID
    const testPlayerId = playerId || `test_${Date.now()}`;
    const testNickname = nickname || `测试玩家_${Math.floor(Math.random() * 1000)}`;
    const testLevel = parseInt(level || '50', 10);

    // 生成 JWT Token
    const accessToken = await this.jwtService.signAsync({
      playerId: testPlayerId,
      openId: `test_openid_${testPlayerId}`,
      type: 'access',
    });

    const refreshToken = await this.jwtService.signAsync(
      {
        playerId: testPlayerId,
        openId: `test_openid_${testPlayerId}`,
        type: 'refresh',
      },
      {
        expiresIn: '7d',
        secret:
          process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      },
    );

    this.logger.warn(`生成了测试 Token: playerId=${testPlayerId}`);

    return {
      message: '这是测试环境的临时 Token，生产环境不可用',
      playerId: testPlayerId,
      nickname: testNickname,
      level: testLevel,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 7200,
        tokenType: 'Bearer',
      },
      usage: {
        http: 'Authorization: Bearer <accessToken>',
        websocket: 'ws://localhost:3000/game?token=<accessToken>',
      },
    };
  }

  /**
   * 模拟微信登录 (测试用)
   * POST /api/test-auth/mock-login
   */
  @Post('mock-login')
  async mockLogin(
    @Body()
    body: {
      playerId?: string;
      nickname?: string;
      level?: number;
    },
  ) {
    // 安全检查：生产环境禁用
    if (!this.isTestEnvironment()) {
      throw new UnauthorizedException('此接口仅在测试环境可用');
    }

    const playerId = body.playerId || `test_${Date.now()}`;

    // 生成 Token
    const accessToken = await this.jwtService.signAsync({
      playerId,
      openId: `test_openid_${playerId}`,
      type: 'access',
    });

    const refreshToken = await this.jwtService.signAsync(
      {
        playerId,
        openId: `test_openid_${playerId}`,
        type: 'refresh',
      },
      {
        expiresIn: '7d',
      },
    );

    return {
      playerId,
      nickname: body.nickname || `测试玩家_${Math.floor(Math.random() * 1000)}`,
      isNewPlayer: true,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 7200,
        tokenType: 'Bearer',
      },
    };
  }

  /**
   * 获取测试环境的 WebSocket 连接信息
   * GET /api/test-auth/ws-info
   */
  @Get('ws-info')
  getWebSocketInfo() {
    if (!this.isTestEnvironment()) {
      throw new UnauthorizedException('此接口仅在测试环境可用');
    }

    return {
      message: 'WebSocket 连接信息 (测试环境)',
      endpoints: [
        {
          name: '统一消息网关 (推荐)',
          namespace: '/game',
          url: 'ws://localhost:3000/game?token=<your_token>',
          description: '所有消息通过 code 路由',
        },
        {
          name: '组队',
          namespace: '/party',
          url: 'ws://localhost:3000/party?token=<your_token>',
        },
        {
          name: '仙府',
          namespace: '/estate',
          url: 'ws://localhost:3000/estate?token=<your_token>',
        },
        {
          name: '交易',
          namespace: '/trade',
          url: 'ws://localhost:3000/trade?token=<your_token>',
        },
      ],
      quickTest: {
        description: '快速测试步骤',
        steps: [
          '1. GET /api/test-auth/quick-token 获取测试 Token',
          '2. 使用返回的 token 连接 WebSocket',
          '3. 发送消息: { code: 0, seq: 1, payload: {}, timestamp: Date.now() }',
        ],
      },
    };
  }

  /**
   * 验证 Token 是否有效 (测试用)
   * GET /api/test-auth/verify?token=xxx
   */
  @Get('verify')
  async verifyToken(@Query('token') token: string) {
    if (!this.isTestEnvironment()) {
      throw new UnauthorizedException('此接口仅在测试环境可用');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      return {
        valid: true,
        payload,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }
}
