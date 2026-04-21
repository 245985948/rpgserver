# 代码结构文档

**分析日期:** 2026/04/21

## 项目目录结构

```
D:\rpgServers\
├── src/                          # 服务端源代码
├── shared/                        # 共享协议 (客户端和服务器共用)
├── .claude/                       # Claude 配置
├── package.json                   # NPM 包清单
├── package-lock.json
├── tsconfig.json                  # TypeScript 配置
└── .env.local                     # 本地环境配置 (需创建)
```

## 顶层目录用途

### `src/` - 服务端源代码

```
src/
├── main.ts                       # 应用入口
├── app.module.ts                 # 根模块
├── config/                       # 配置模块
├── core/                         # 核心功能
├── database/                     # 数据库模块
├── redis/                        # Redis 模块
├── shared/                       # 共享工具和常量
├── common/                       # 通用组件
└── modules/                      # 业务模块
```

### `shared/` - 共享协议目录

```
shared/
├── proto/                        # Protobuf 协议定义
│   └── game.proto                # 游戏协议定义
├── protocol/                      # 协议常量 (客户端和服务器共用)
│   ├── message-codes.ts          # 消息号定义
│   ├── types.ts                  # 共享类型
│   └── index.ts
└── 同步proto.bat                  # 同步 proto 文件的脚本
```

## `src/` 子目录详解

### `src/config/` - 配置模块

**用途:** 集中管理应用配置

| 文件 | 用途 |
|------|------|
| `index.ts` | 配置导出汇总 |
| `app.config.ts` | 应用配置 |
| `database.config.ts` | MongoDB 配置 |
| `redis.config.ts` | Redis 配置 |
| `game.config.ts` | 游戏相关配置 |

**关键配置:**
- MongoDB: `mongodb://localhost:27017/taixu`
- Redis: 从环境变量读取
- JWT Secret: 从环境变量读取，默认 `default-secret-change-in-production`

### `src/core/` - 核心功能

**用途:** 应用核心功能模块

| 文件 | 用途 |
|------|------|
| `message-router.ts` | 消息号路由，将消息路由到处理器 |
| `event.manager.ts` | 事件管理 |
| `config.manager.ts` | 配置管理器 |
| `cross-service.event-bus.ts` | 跨服务事件总线 |
| `index.ts` | 导出汇总 |

### `src/database/` - 数据库模块

**用途:** MongoDB 连接和 Schema 定义

| 文件 | 用途 |
|------|------|
| `database.module.ts` | 数据库模块 (全局) |
| `schemas/index.ts` | Schema 导出汇总 |
| `schemas/player.schema.ts` | 玩家数据 Schema |
| `schemas/estate.schema.ts` | 仙府数据 Schema |
| `schemas/trade.schema.ts` | 交易数据 Schema |
| `index.ts` | 导出汇总 |

**Player Schema 关键字段:**
```typescript
{
  username, passwordHash, passwordSalt,  // 账号登录
  openId,                                // 微信 openId
  nickname, avatarUrl,                   // 基本信息
  realm, realmProgress,                  // 境界
  status,                                // 在线状态
  combatAttributes,                      // 战斗属性 (8种)
  productionSkills,                      // 生产技能 (10种)
  unlockedMeridianSlots,                 // 经脉槽位
  equippedArtifacts,                     // 经脉装备
  equipments,                            // 装备
  currencies,                            // 货币
  inventory,                             // 背包物品 (Map<string, number>)
  statistics,                            // 统计数据
}
```

**Estate Schema 关键字段:**
```typescript
{
  playerId,                              // 玩家ID (唯一索引)
  buildings: [{
    type,                               // 建筑类型
    level,                              // 等级
    buildProgress,                      // 建造进度
    isConstructing,                    // 是否建造中
    boostEndTime,                       // 加速结束时间
  }],
  spiritGatheringRate,                   // 灵气聚集速率
  visitorLogs: [{                       // 访客记录
    visitorId, visitTime, action, targetBuilding
  }],
  lastStealTimes,                        // 偷取冷却
}
```

### `src/redis/` - Redis 模块

**用途:** Redis 连接和缓存服务

| 文件 | 用途 |
|------|------|
| `redis.module.ts` | Redis 模块 |
| `redis.service.ts` | Redis 服务 (缓存、锁、发布订阅) |
| `redis-pubsub.service.ts` | Redis 发布订阅服务 |
| `index.ts` | 导出汇总 |

### `src/shared/` - 共享工具

**用途:** 各模块共享的工具、常量、类型

| 目录/文件 | 用途 |
|-----------|------|
| `constants/index.ts` | 全局常量 (缓存Key、事件名、系统限制) |
| `constants/message-codes.ts` | 消息号定义 |
| `enums/index.ts` | 游戏枚举 (Realm, CombatAttribute, CurrencyType 等) |
| `types/index.ts` | 共享类型定义 |
| `utils/index.ts` | 共享工具函数 |
| `protobuf/` | Protobuf 编解码服务 |

### `src/common/` - 通用组件

**用途:** 可复用的 NestJS 组件

| 目录 | 用途 |
|------|------|
| `controllers/` | 通用控制器 (health, root) |
| `decorators/` | 装饰器 (CurrentUser, AllowAnonymous) |
| `filters/` | 异常过滤器 |
| `guards/` | 守卫 (JwtAuthGuard) |
| `interceptors/` | 拦截器 (Protobuf, Transform, Logging) |
| `pipes/` | 管道 |

### `src/modules/` - 业务模块

**用途:** 业务功能模块

| 模块目录 | 功能 |
|----------|------|
| `auth/` | 认证 (微信登录、账号密码登录、Token管理) |
| `gateway/` | WebSocket 网关 (消息路由、连接管理) |
| `player/` | 玩家数据 (资料、属性、背包) |
| `battle/` | 战斗系统 (流派、队伍、副本) |
| `estate/` | 仙府系统 (建筑、访客、偷灵气) |
| `market/` | 坊市系统 (上架、购买、拍卖) |
| `offline/` | 离线收益 |
| `example/` | 示例模块 |

## 关键文件位置

### 入口文件

| 文件 | 路径 | 用途 |
|------|------|------|
| 应用入口 | `src/main.ts` | 启动服务器、配置中间件 |
| 根模块 | `src/app.module.ts` | 组织所有功能模块 |

### 配置文件

| 文件 | 路径 | 用途 |
|------|------|------|
| 应用配置 | `src/config/app.config.ts` | 端口、环境等 |
| 数据库配置 | `src/config/database.config.ts` | MongoDB 连接 |
| Redis 配置 | `src/config/redis.config.ts` | Redis 连接 |
| 游戏配置 | `src/config/game.config.ts` | 游戏系统参数 |
| 环境变量 | `.env` | 密钥等敏感配置 |

### 核心逻辑文件

| 文件 | 路径 | 用途 |
|------|------|------|
| 消息网关 | `src/modules/gateway/message.gateway.ts` | WebSocket 消息处理 |
| 消息路由 | `src/core/message-router.ts` | 消息号 -> 处理器映射 |
| 认证服务 | `src/modules/auth/auth.service.ts` | 登录、Token 管理 |
| 玩家服务 | `src/modules/player/player.service.ts` | 玩家数据操作 |
| 战斗服务 | `src/modules/battle/battle.service.ts` | 战斗逻辑 |
| 仙府服务 | `src/modules/estate/estate.service.ts` | 仙府逻辑 |
| 市场服务 | `src/modules/market/market.service.ts` | 市场交易逻辑 |

### 协议定义文件

| 文件 | 路径 | 用途 |
|------|------|------|
| Protobuf 定义 | `shared/proto/game.proto` | 协议消息格式 |
| 消息号定义 | `src/shared/constants/message-codes.ts` | 消息码常量 |

## 命名约定

### 文件命名

| 类型 | 约定 | 示例 |
|------|------|------|
| TypeScript 源文件 |  kebab-case | `player.service.ts` |
| Schema 文件 |  kebab-case | `player.schema.ts` |
| 目录 |  kebab-case | `modules/gateway/` |
| 模块入口 |  index.ts | `modules/auth/index.ts` |
| 配置文件 |  kebab-case | `database.config.ts` |

### 目录命名

| 目录 | 命名 | 说明 |
|------|------|------|
| 业务模块 |  kebab-case | `modules/estate/` |
| Schema 目录 |  kebab-case | `database/schemas/` |
| 通用组件 |  kebab-case | `common/decorators/` |
| 配置文件 |  kebab-case | `config/` |

### 代码命名

| 类型 | 约定 | 示例 |
|------|------|------|
| 类名 | PascalCase | `AuthService`, `PlayerSchema` |
| 接口名 | PascalCase | `ILoginResponse`, `IGameMessage` |
| 枚举 | PascalCase | `Realm`, `CombatAttribute` |
| 函数/方法 | camelCase | `wechatLogin()`, `buyItem()` |
| 变量 | camelCase | `playerId`, `accessToken` |
| 常量 | UPPER_SNAKE_CASE | `JWT_CONFIG`, `CACHE_KEYS` |
| 枚举值 | SNAKE_CASE | `QI_REFINING`, `SPIRIT_STONE` |

### 数据库 Schema 命名

| 类型 | 约定 | 示例 |
|------|------|------|
| Schema 类名 | PascalCase | `Player`, `Estate`, `Trade` |
| Collection 名称 | 小写复数 | `players`, `estates`, `trades` |
| 索引字段 | 小写 | `playerId`, `openId` |
| 字段名 | camelCase | `lastLoginAt`, `realmProgress` |

## 模块添加指南

### 添加新业务模块

1. 在 `src/modules/` 下创建目录:
   ```
   src/modules/new-feature/
   ├── new-feature.module.ts
   ├── new-feature.controller.ts (可选)
   ├── new-feature.service.ts
   ├── new-feature.gateway.ts (可选)
   └── index.ts
   ```

2. 在模块内注册服务:
   ```typescript
   // new-feature.module.ts
   @Module({
     providers: [NewFeatureService],
     controllers: [NewFeatureController],
     exports: [NewFeatureService],
   })
   export class NewFeatureModule {}
   ```

3. 在 `src/modules/index.ts` 中导出

4. 在 `app.module.ts` 中导入

### 添加新消息处理

1. 在 `message-codes.ts` 中定义消息码:
   ```typescript
   export const NewFeatureCodes = {
     DO_SOMETHING_REQ: 7000,
     DO_SOMETHING_RESP: 7001,
   };
   ```

2. 在 Gateway 中注册处理器:
   ```typescript
   // message.gateway.ts 的 registerHandlers()
   this.messageRouter.register(NewFeatureCodes.DO_SOMETHING_REQ,
     async (msg) => {
       // 处理逻辑
       return result;
     },
     { requireAuth: true }
   );
   ```

### 添加新 Schema

1. 在 `src/database/schemas/` 创建文件:
   ```typescript
   // new-entity.schema.ts
   @Schema({ collection: 'new_entities' })
   export class NewEntity {
     @Prop({ required: true })
     name: string;
   }
   export const NewEntitySchema = SchemaFactory.createForClass(NewEntity);
   ```

2. 在 `database.module.ts` 中注册:
   ```typescript
   MongooseModule.forFeature([
     { name: NewEntity.name, schema: NewEntitySchema },
   ]);
   ```

## 特殊目录说明

### `shared/` 目录

**用途:** 客户端和服务器共享的协议定义

**注意:**
- `shared/proto/game.proto` 定义了所有游戏消息的 Protobuf 格式
- `shared/protocol/message-codes.ts` 定义了消息号 (客户端和服务器必须一致)
- 客户端应该复制 `shared/` 目录下的文件使用

### `.claude/` 目录

**用途:** Claude Code 配置

| 文件 | 用途 |
|------|------|
| `settings.local.json` | 本地设置 |
| `skills/` | 技能定义 |

### `.env` 文件

**用途:** 环境变量配置

**关键变量:**
```bash
MONGODB_URI=mongodb://localhost:27017/taixu
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
NODE_ENV=development
```

---

*结构分析: 2026/04/21*
