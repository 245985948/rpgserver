/**
 * 公共模块
 * 统一注册公共组件
 */

import { Module, Global } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';
import { RootController } from './controllers/root.controller';

@Global()
@Module({
  controllers: [RootController, HealthController],
})
export class CommonModule {}
