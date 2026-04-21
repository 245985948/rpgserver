# 架构文档

**分析日期:** 2026/04/21

## 架构概述

**整体模式:** NestJS 模块化架构 + Socket.IO WebSocket 网关

**核心特点:**
- 基于 NestJS 框架的分层模块化架构
- MongoDB (Mongoose ODM) 作为主数据库
- Redis 用于缓存、会话管理和分布式锁
- Socket.IO 实现 WebSocket 通信，支持双协议 (JSON + Protobuf)
- JWT Token 实现无状态认证
- 消息号路由模式实现统一的消息处理

## 分层架构

### 入口层 (Entry Layer)

**文件位置:** `src/main.ts`

- 启动 NestJS 应用
- 配置 WebSocket 适配器 (IoAdapter)
- 设置全局管道、拦截器、过滤器
- 启用 CORS 和全局前缀 `/api`
- HTTP Keep-Alive 配置 (65秒)

### 应用模块层 (App Module)

**文件位置:** `src/app.module.ts`

```
AppModule
├── ConfigModule (全局配置)
├── CoreModule (核心)
├── DatabaseModule (MongoDB连接)
├── RedisModule (Redis连接)
├── ProtobufModule (Protobuf序列化)
├── CommonModule (通用组件)
├── AuthModule (认证)
├── PlayerModule (玩家)
├── OfflineModule (离线)
├── BattleModule (战斗)
├── EstateModule (仙府)
├── MarketModule (坊市)
└── GatewayModule (WebSocket网关)
```

### 核心基础设施层 (Infrastructure)

**位置:** `src/core/`

| 模块 | 文件 | 职责 |
|------|------|------|
| MessageRouter | `core/message-router.ts` | 消息号路由，将消息号路由到对应处理器 |
| EventManager | `core/event.manager.ts` | 事件管理 (待查看具体实现) |
| ConfigManager | `core/config.manager.ts` | 配置管理 |

### 数据层 (Data Layer)

**位置:** `src/database/`

| Schema | 文件 | 用途 |
|--------|------|------|
| Player | `database/schemas/player.schema.ts` | 玩家数据 (角色、属性、背包、装备、货币) |
| Estate | `database/schemas/estate.schema.ts` | 仙府数据 (建筑、访客记录) |
| Trade | `database/schemas/trade.schema.ts` | 交易数据 (市场中上架的物品) |

**数据库配置:** `src/config/database.config.ts`
- MongoDB URI: `mongodb://localhost:27017/taixu`
- 连接池: 最大50，最小10

### 缓存层 (Cache Layer)

**位置:** `src/redis/`

**服务:** `redis/redis.service.ts`

核心功能:
- 基础缓存 (GET/SET/DEL)
- JSON 对象缓存
- 哈希表操作
- 有序集合 (排行榜)
- **分布式锁** (acquireLock/releaseLock)
- 发布/订阅

**缓存 Key 前缀定义:** `src/shared/constants/index.ts`
```typescript
CACHE_KEYS = {
  PLAYER: 'player:',        // 玩家数据缓存
  SESSION: 'session:',      // 会话管理
  RANKING: 'ranking:',      // 排行榜
  AUCTION: 'auction:',       // 拍卖
  MARKET: 'market:',         // 市场列表
  DUNGEON: 'dungeon:',       // 副本
  PARTY: 'party:',           // 队伍
  ESTATE: 'estate:',         // 仙府
  LOCK: 'lock:',             // 分布式锁
}
```

### 消息网关层 (Gateway Layer)

**位置:** `src/modules/gateway/`

#### MessageGateway (主网关)

**文件:** `gateway/message.gateway.ts`

**职责:**
- 统一处理所有 WebSocket 消息
- 通过消息号路由到处理器
- 支持 Protobuf 和 JSON 双协议自动检测
- 管理玩家连接状态

**配置:**
```typescript
@WebSocketGateway({
  namespace: '/',
  cors: { origin: '*', credentials: false },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
})
```

**消息格式:**
```typescript
interface IWSMessageBody {
  code: number;    // 消息号
  seq: number;     // 序列号
  payload: unknown; // 消息数据
  useProtobuf?: boolean;
}
```

#### WebSocketGatewayImpl (原生 WebSocket)

**文件:** `gateway/websocket.gateway.ts`

- 命名空间: `/game-ws`
- 为不支持 Socket.IO 的客户端提供原生 WebSocket 支持

#### MessageRouter (消息路由器)

**文件:** `core/message-router.ts`

- 注册消息处理器
- 路由消息到对应处理器
- 支持 requireAuth 配置 (是否需要登录)
- 支持 rateLimit 配置 (速率限制)
- 提供路由表打印 (调试用)

### 业务模块层 (Business Modules)

#### 认证模块 (Auth)

**位置:** `src/modules/auth/`

| 文件 | 职责 |
|------|------|
| `auth.service.ts` | 核心认证逻辑 |
| `auth.controller.ts` | HTTP 认证接口 |
| `auth.module.ts` | 全局认证模块配置 |

**认证方式:**
1. **微信登录** - 模拟微信 API 获取 openId
2. **账号密码登录** - 用户名+密码 (bcrypt 加密)
3. **Token 刷新** - Refresh Token 机制

**JWT 配置:**
- Access Token 过期: 2小时
- Refresh Token 过期: 7天
- Refresh Token 存储在 Redis 中用于撤销

**HTTP 接口:**
```
POST /api/auth/wechat-login      - 微信登录
POST /api/auth/account-login     - 账号登录
POST /api/auth/account-register  - 账号注册
POST /api/auth/refresh-token     - 刷新 Token
POST /api/auth/logout            - 登出
```

#### 玩家模块 (Player)

**位置:** `src/modules/player/`

**服务:** `player/player.service.ts`

**功能:**
- 获取玩家资料 (带缓存)
- 更新玩家状态
- 获取战斗属性
- 获取生产技能
- 获取经脉槽位状态
- 验证玩家存在性

#### 战斗模块 (Battle)

**位置:** `src/modules/battle/`

**服务:** `battle/battle.service.ts`

**功能:**
- 流派切换 (剑修/法修/体修)
- 获取流派属性加成
- 创建/加入/离开队伍
- 境界压制检测

**战斗相关网关:**
- `party.gateway.ts` - 队伍相关 WebSocket 处理

#### 仙府模块 (Estate)

**位置:** `src/modules/estate/`

**服务:** `estate/estate.service.ts`

**功能:**
- 仙府数据管理 (14种建筑)
- 建筑建造/升级
- 偷取灵气 (带冷却和分布式锁)
- 协助加速建造
- 访客记录

**相关网关:** `estate.gateway.ts`

#### 坊市模块 (Market)

**位置:** `src/modules/market/`

**服务:** `market/market.service.ts`

**功能:**
- 物品上架 (18% 交易税)
- 购买物品 (分布式锁保证并发安全)
- 下架物品
- 获取市场列表
- 市场统计

**拍卖服务:** `auction.service.ts`
**风控服务:** `risk-control.service.ts`

**相关网关:** `trade.gateway.ts`

#### 离线模块 (Offline)

**位置:** `src/modules/offline/`

**功能:** 离线收益计算

## 消息流 (Message Flow)

### WebSocket 消息流程

```
客户端  ──────────────────────────────────────────────────────>  服务器

1. 连接建立
   客户端 ──(WebSocket 连接)──> MessageGateway.handleConnection()
   客户端 <──(connected 事件)── 服务器

2. 消息发送
   客户端 ──(message 事件: {code, seq, payload})──> handleMessage()

3. 消息路由
   handleMessage()
   ├── 解析消息 (Protobuf/JSON)
   ├── 提取 Token 并验证
   ├── MessageRouter.route(message)
   │   └── 注册的 Handler 处理
   └── client.emit('message', response)

4. 服务器推送 (Push)
   服务器 ──(push 事件)──> 客户端
   ├── pushToPlayer(playerId, code, payload)  // 单人推送
   ├── broadcast(code, payload)                // 广播
   └── broadcastToRoom(roomId, code, payload) // 房间广播
```

### 认证流程

```
登录流程:

1. 微信登录
   客户端 ──(WECHAT_LOGIN_REQ)──> AuthService.wechatLogin()
   ├── 模拟调用微信API获取 openId
   ├── 查找或创建 Player 文档
   ├── 生成 JWT Tokens (access + refresh)
   ├── 存储 Refresh Token 到 Redis
   └── 返回 tokens + playerData

2. 账号登录
   客户端 ──(ACCOUNT_LOGIN_REQ)──> AuthService.accountLogin()
   ├── 根据 username 查找 Player
   ├── 验证密码 (bcrypt.compare)
   ├── 生成 JWT Tokens
   └── 返回 tokens + playerData

3. Token 刷新
   客户端 ──(REFRESH_TOKEN_REQ)──> AuthService.refreshTokens()
   ├── 验证 Refresh Token
   ├── 检查 Redis 中的 Token 是否存在
   ├── 生成新的 Access Token
   └── 撤销旧 Refresh Token, 存储新的

4. 登出
   客户端 ──(LOGOUT_REQ)──> AuthService.logout()
   ├── 删除 Redis 中的 Refresh Token
   ├── 将 Token 加入黑名单
   └── 更新 Player 状态为 offline
```

### 消息号协议

**位置:** `src/shared/constants/message-codes.ts`

**号段分配:**
| 模块 | 号段 | 示例 |
|------|------|------|
| 系统 | 000000-000999 | 心跳、时间同步 |
| 认证 | 001000-001999 | 登录、注册、Token刷新 |
| 玩家 | 002000-002999 | 玩家数据、背包、装备 |
| 战斗 | 003000-003999 | 战斗、队伍、副本 |
| 经济 | 004000-004999 | 市场、拍卖、交易 |
| 仙府 | 005000-005999 | 建筑、收获、拜访 |
| 社交 | 006000-006999 | 好友、邮件、聊天 |
| 服务器推送 | 900000-999999 | 属性变更、通知 |

**请求/响应规则:**
- 偶数为请求码
- 奇数为响应码 (请求码 + 1)
- 推送使用 900000 以上号段

## Protobuf 协议

**定义文件:** `shared/proto/game.proto`

**主要消息:**
```protobuf
message GameRequest {
  int32 seq = 1;
  string route = 2;
  bytes payload = 3;
  int64 timestamp = 4;
  string token = 5;
}

message GameResponse {
  int32 seq = 1;
  string route = 2;
  bool success = 3;
  bytes payload = 4;
  ErrorInfo error = 5;
  int64 timestamp = 6;
  int32 processing_time = 7;
}

message WebSocketMessage {
  string event = 1;
  bytes payload = 2;
  int64 timestamp = 3;
  int32 seq = 4;
  string target_player = 5;
}
```

## 数据流管道

### 玩家数据管道

```
客户端请求 ──> WebSocket Gateway ──> MessageRouter ──> Handler
                                                    │
                                                    ▼
                                              PlayerService
                                                    │
                                        ┌───────────┴───────────┐
                                        ▼                       ▼
                                  Redis Cache            MongoDB
                                  (5分钟TTL)              (持久化)
                                        │                       │
                                        └───────────┬───────────┘
                                                    ▼
                                              响应数据
                                                    │
                                                    ▼
                                              推送更新 ──> 客户端
```

### 市场交易管道

```
上架物品:
客户端 ──> MarketService.listItem() ──> Trade Schema ──> Redis ZSET (价格索引)

购买物品:
客户端 ──> MarketService.buyItem()
         │
         ├── 分布式锁 (Redis SETNX)
         ├── 检查交易状态
         ├── 更新 Trade (isCompleted=true)
         ├── 扣款/发货
         └── 释放锁
```

### 仙府建筑管道

```
开始建造:
客户端 ──> EstateService.startBuilding()
         │
         ├── 分布式锁
         ├── 更新 Estate Schema (isConstructing=true)
         └── setTimeout (模拟定时任务)

建造完成:
         └── completeBuilding() ──> 更新 Schema (level++)
```

## 错误处理

**错误码定义:** `src/shared/constants/message-codes.ts`

| 类别 | 号段 |
|------|------|
| 系统错误 | 1000-1999 |
| 认证错误 | 2000-2999 |
| 玩家数据错误 | 3000-3999 |
| 背包/物品错误 | 4000-4999 |
| 货币错误 | 5000-5999 |
| 战斗错误 | 6000-6999 |
| 经济错误 | 7000-7999 |
| 仙府错误 | 8000-8999 |
| 社交错误 | 9000-9999 |

**异常过滤器:** `src/common/filters/`
- HttpExceptionFilter
- AllExceptionsFilter

## 通用组件

**位置:** `src/common/`

| 组件 | 目录 | 用途 |
|------|------|------|
| 控制器 | controllers/ | Health、Root 控制器 |
| 装饰器 | decorators/ | CurrentUser, AllowAnonymous |
| 过滤器 | filters/ | HTTP 异常、全局异常 |
| 拦截器 | interceptors/ | Transform, Logging, Protobuf |
| 守卫 | guards/ | JwtAuthGuard |

---

*架构分析: 2026/04/21*
