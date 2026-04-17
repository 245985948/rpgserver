/**
 * 坊市与天道经济模块
 * 对应PRD 2.5 坊市与天道经济
 */

import { Module } from '@nestjs/common';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { AuctionService } from './auction.service';
import { RiskControlService } from './risk-control.service';
import { TradeGateway } from './trade.gateway';

@Module({
  controllers: [MarketController],
  providers: [MarketService, AuctionService, RiskControlService, TradeGateway],
  exports: [MarketService, AuctionService, RiskControlService],
})
export class MarketModule {}
