# 太墟修仙录服务端框架

《太墟修仙录》游戏服务端，基于 **NestJS + TypeScript + MongoDB + Redis** 构建。

## 技术栈

| 组件 | 选型 | 说明 |
|------|------|------|
| 开发语言 | TypeScript (Node.js) | 与Cocos客户端共用数据接口 |
| 框架 | NestJS | 模块化、可扩展的企业级框架 |
| 数据库 | MongoDB | 适配JSON数据结构的文档数据库 |
| 缓存 | Redis | 高并发拍卖行、排行榜、分布式锁 |
| 通信 | HTTP + WebSocket | 核心业务走HTTP，实时玩法走WebSocket |

## 项目结构

```
src/
├── common/           # 公共组件(过滤器、守卫、拦截器、管道)
├── config/           # 配置文件
├── core/             # 核心模块(事件管理、配置管理)
├── database/         # 数据库模块(Schema、连接)
├── redis/            # Redis模块(缓存、分布式锁)
├── modules/          # 业务模块(按PRD章节组织)
│   ├── auth/         # 微信登录认证
│   ├── player/       # 2.1 玩家数据与状态聚合
│   ├── offline/      # 2.2 离线收益计算中心
│   ├── battle/       # 2.3 自由流派与战斗验证
│   ├── estate/       # 2.4 仙府基建与社交
│   └── market/       # 2.5 坊市与天道经济
└── shared/           # 共享代码(常量、枚举、接口、工具)
```

## 🚀 快速开始

### 环境要求

| 软件 | 版本 | 必需 |
|------|------|------|
| [Node.js](https://nodejs.org/) | 18.x+ | ✅ |
| [MongoDB](https://www.mongodb.com/) | 6.x+ | ✅ |
| [Redis](https://redis.io/) | 7.x+ | ✅ |

### 一键启动 (Windows)

```bash
# 1. 双击运行启动脚本
start.bat
```

### 手动启动

```bash
# 1. 检查环境
node check-env.js

# 2. 安装依赖
npm install

# 3. 创建配置文件
copy .env.example .env
# 编辑 .env 配置数据库连接

# 4. 启动开发服务器
npm run start:dev
```

### 验证运行

```bash
# 健康检查
curl http://localhost:3000/api/health

# 预期返回
{"status":"healthy","database":true,"redis":true}
```

**详细教程请查看 [SETUP.md](./SETUP.md)**

## 核心功能模块

### 2.1 玩家数据与状态聚合模块

- 拆分存储18项修真百艺数据
- 校验10个生产技能等级与经验
- 校验8个战斗属性
- 验证神识等级解锁经脉槽位(20/50/90)

### 2.2 离线收益计算中心

- **统计学期望公式计算**(避免遍历数万次离线动作)
- 效率加成: 每高1级技能提供1%效率
- 防爆号: 强制12小时离线收益上限

### 2.3 自由流派与战斗验证引擎

- 实时流派切换(剑修/法修/体修)
- 组队境界压制(高出20%触发天道压制)
- 九幽幻境: 引路符(上限100)、隐匿阵(上限4)

### 2.4 仙府基建与社交模块

- 14种可建造设施增益校验
- 道友拜访机制(偷灵气/协助加速)
- 分布式锁处理并发逻辑

### 2.5 坊市与天道经济

- **多轨制货币**: 灵石(流通)、仙玉(付费)、功德(互动)
- **天道税**: 18%交易税回收
- **防黑产**: 赠礼上限10M灵石、7天借贷欺诈检测

## 扩展点设计

### 1. 添加新模块

在 `src/modules/` 下创建模块文件夹，参考现有模块结构:

```typescript
// src/modules/new-feature/new-feature.module.ts
import { Module } from '@nestjs/common';

@Module({
  controllers: [NewFeatureController],
  providers: [NewFeatureService],
  exports: [NewFeatureService],
})
export class NewFeatureModule {}
```

然后在 `src/app.module.ts` 中导入:

```typescript
import { NewFeatureModule } from './modules';

@Module({
  imports: [
    // ...其他模块
    NewFeatureModule,
  ],
})
```

### 2. 添加新配置表

在 `src/core/config.manager.ts` 中加载:

```typescript
async loadAllConfigs(): Promise<void> {
  // 添加新配置表
  this.configCache.set('new_config', await loadNewConfig());
}
```

### 3. 添加新事件

在 `src/shared/constants/index.ts` 中定义:

```typescript
export const EVENTS = {
  // ...现有事件
  NEW_EVENT: 'custom:new_event',
};
```

然后在业务代码中发布/订阅:

```typescript
// 发布事件
this.eventManager.emit(EVENTS.NEW_EVENT, data, playerId);

// 订阅事件
this.eventManager.on(EVENTS.NEW_EVENT).subscribe((event) => {
  // 处理事件
});
```

### 4. 添加新WebSocket网关

参考 `src/modules/battle/party.gateway.ts`:

```typescript
@WebSocketGateway({ namespace: 'custom' })
export class CustomGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('custom-event')
  handleEvent(@MessageBody() data: any) {
    // 处理消息
  }
}
```

## API 文档

### HTTP 接口

| 模块 | 路径 | 说明 |
|------|------|------|
| Auth | POST /api/auth/wechat-login | 微信登录 |
| Player | GET /api/player/profile | 获取玩家资料 |
| Player | GET /api/player/combat-attributes | 战斗属性 |
| Player | GET /api/player/production-skills | 生产技能 |
| Offline | POST /api/offline/set-task | 设置离线任务 |
| Offline | POST /api/offline/claim | 领取离线收益 |
| Battle | POST /api/battle/switch-style | 切换流派 |
| Battle | POST /api/battle/party/create | 创建队伍 |
| Estate | GET /api/estate/my-estate | 我的仙府 |
| Estate | POST /api/estate/build | 建造建筑 |
| Market | POST /api/market/sell | 上架物品 |
| Market | POST /api/market/buy | 购买物品 |
| Market | POST /api/market/auction/bid | 拍卖出价 |

### WebSocket 命名空间

| 命名空间 | 用途 |
|----------|------|
| /party | 组队实时通信 |
| /estate | 仙府建造通知 |
| /trade | 市场/拍卖实时更新 |

## 开发规范

### 代码风格

- 使用 TypeScript 严格模式
- 所有接口定义在 `src/shared/interfaces/`
- 所有枚举定义在 `src/shared/enums/`
- 所有常量定义在 `src/shared/constants/`

### 数据库操作

- 使用 Mongoose Schema 定义数据模型
- 复杂查询使用 Lean() 提升性能
- 关键操作使用 Redis 分布式锁

### 缓存策略

- 玩家数据: 5分钟缓存
- 配置表: 内存常驻
- 会话: 2小时过期

## 性能优化建议

1. **配置表字典化**: 所有装备/词缀配置内存常驻，玩家数据只存ID引用
2. **离线收益统计计算**: 使用期望公式，不遍历单次动作
3. **数据库索引**: 已按查询模式建立索引
4. **Redis分布式锁**: 高并发场景(拍卖、交易、仙府互访)

## License

MIT
