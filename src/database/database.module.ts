/**
 * 数据库模块
 * 提供MongoDB连接和模型注入
 */

import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Player, PlayerSchema } from './schemas/player.schema';
import { Estate, EstateSchema } from './schemas/estate.schema';
import { Trade, TradeSchema } from './schemas/trade.schema';

@Global()
@Module({
  imports: [
    // MongoDB连接
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('mongodb.uri'),
        ...configService.get('mongodb.options'),
      }),
      inject: [ConfigService],
    }),

    // 注册Schema
    MongooseModule.forFeature([
      { name: Player.name, schema: PlayerSchema },
      { name: Estate.name, schema: EstateSchema },
      { name: Trade.name, schema: TradeSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
