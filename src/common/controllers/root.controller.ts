/**
 * 根路由控制器
 * 提供API入口信息
 */

import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller()
export class RootController {
  constructor(private configService: ConfigService) {}

  /**
   * API 根路径 - 返回所有可用接口
   */
  @Get()
  index() {
    return {
      name: '太墟修仙录服务端',
      version: this.configService.get('version'),
      environment: this.configService.get('nodeEnv'),
      timestamp: Date.now(),
      apis: {
        health: {
          status: '/api/health',
          details: '/api/health/details',
        },
        auth: {
          wechatLogin: 'POST /api/auth/wechat-login',
          verifySession: 'GET /api/auth/verify-session',
        },
        player: {
          profile: 'GET /api/player/profile',
          combatAttributes: 'GET /api/player/combat-attributes',
          productionSkills: 'GET /api/player/production-skills',
          meridianSlots: 'GET /api/player/meridian-slots',
        },
        offline: {
          setTask: 'POST /api/offline/set-task',
          claim: 'POST /api/offline/claim',
          preview: 'GET /api/offline/preview',
        },
        battle: {
          switchStyle: 'POST /api/battle/switch-style',
          styleAttributes: 'GET /api/battle/style-attributes',
          createParty: 'POST /api/battle/party/create',
          joinParty: 'POST /api/battle/party/join',
          leaveParty: 'POST /api/battle/party/leave',
          enterDungeon: 'POST /api/battle/dungeon/enter',
          useDungeonItem: 'POST /api/battle/dungeon/use-item',
          dungeonStatus: 'GET /api/battle/dungeon/status',
        },
        estate: {
          myEstate: 'GET /api/estate/my-estate',
          visit: 'GET /api/estate/visit?playerId={id}',
          build: 'POST /api/estate/build',
          boost: 'POST /api/estate/boost',
          steal: 'POST /api/estate/steal',
          assist: 'POST /api/estate/assist',
          visitorLogs: 'GET /api/estate/visitor-logs',
        },
        market: {
          sell: 'POST /api/market/sell',
          buy: 'POST /api/market/buy',
          listings: 'GET /api/market/listings',
          cancel: 'POST /api/market/cancel',
          createAuction: 'POST /api/market/auction/create',
          bid: 'POST /api/market/auction/bid',
          auctions: 'GET /api/market/auction/list',
          myAuctions: 'GET /api/market/auction/my',
          stats: 'GET /api/market/stats',
          history: 'GET /api/market/history',
        },
      },
      websocket: {
        party: 'ws://localhost:3000/party',
        estate: 'ws://localhost:3000/estate',
        trade: 'ws://localhost:3000/trade',
      },
      documentation: {
        setup: '/SETUP.md',
        api: '/API.md',
        extension: '/EXTENSION.md',
      },
    };
  }
}
