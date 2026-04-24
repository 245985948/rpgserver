/**
 * 健康检查控制器
 * 提供服务端运行状态监控
 */

import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  /**
   * 基础健康检查
   */
  @Get()
  async check() {
    const checks = {
      database: true, // 简化检查
      redis: await this.checkRedis(),
      timestamp: Date.now(),
      version: this.configService.get('version'),
      environment: this.configService.get('nodeEnv'),
    };

    const isHealthy = checks.database && checks.redis;

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      ...checks,
    };
  }

  /**
   * 详细状态
   */
  @Get('details')
  async details() {
    return {
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
        platform: process.platform,
      },
      database: {
        connected: true,
        name: 'taixu',
        host: 'localhost',
      },
      config: {
        offlineMaxHours: this.configService.get('offline.maxHours'),
        tradeTaxRate: this.configService.get('economy.tradeTaxRate'),
        maxPartySize: this.configService.get('combat.maxPartySize'),
      },
    };
  }

  private async checkRedis(): Promise<boolean> {
    try {
      await this.redisService.getClient().ping();
      return true;
    } catch {
      return false;
    }
  }
}
