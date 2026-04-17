/**
 * 仙府基建与社交模块
 * 对应PRD 2.4 仙府基建与社交模块
 */

import { Module } from '@nestjs/common';
import { EstateController } from './estate.controller';
import { EstateService } from './estate.service';
import { EstateGateway } from './estate.gateway';

@Module({
  controllers: [EstateController],
  providers: [EstateService, EstateGateway],
  exports: [EstateService],
})
export class EstateModule {}
