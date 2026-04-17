# API 接口文档

本文档列出服务端所有可用的 HTTP 接口和 WebSocket 事件。

---

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: Header 中携带 `x-player-id`
- **响应格式**: JSON

### 通用响应结构

```json
{
  "code": 200,
  "message": "success",
  "data": { },
  "timestamp": 1709000000000
}
```

### 错误响应结构

```json
{
  "code": 400,
  "message": "错误信息",
  "data": null,
  "timestamp": 1709000000000
}
```

---

## 接口列表

### 🔐 认证模块

#### 微信登录

```http
POST /auth/wechat-login
Content-Type: application/json

{
  "code": "微信登录code",
  "encryptedData": "可选",
  "iv": "可选"
}
```

**响应**:
```json
{
  "playerId": "玩家ID",
  "sessionKey": "会话密钥",
  "refreshToken": "刷新令牌",
  "isNewPlayer": true
}
```

#### 验证会话

```http
GET /auth/verify-session
x-session-key: {sessionKey}
```

---

### 👤 玩家模块

#### 获取玩家资料

```http
GET /player/profile
x-player-id: {playerId}
```

#### 获取战斗属性

```http
GET /player/combat-attributes
x-player-id: {playerId}
```

**响应**:
```json
{
  "realm": 10,
  "physique": 15,
  "spirit": 20,
  "gang_qi": 8,
  "protection": 12,
  "sword_art": 25,
  "telekinesis": 10,
  "spell": 18
}
```

#### 获取生产技能

```http
GET /player/production-skills
x-player-id: {playerId}
```

**响应**:
```json
[
  { "type": "breathing", "level": 10, "exp": 500 },
  { "type": "herb_gathering", "level": 5, "exp": 200 }
]
```

#### 获取经脉槽位

```http
GET /player/meridian-slots
x-player-id: {playerId}
```

**响应**:
```json
{
  "unlockedSlots": 3,
  "maxSlots": 4,
  "equipped": ["artifact_001", "artifact_002"]
}
```

---

### ⏱️ 离线收益模块

#### 设置离线任务

```http
POST /offline/set-task
Content-Type: application/json
x-player-id: {playerId}

{
  "skillType": "breathing",
  "efficiency": 10
}
```

#### 领取离线收益

```http
POST /offline/claim
x-player-id: {playerId}
```

**响应**:
```json
{
  "rewards": [
    { "itemId": "spirit_energy", "count": 1200 }
  ],
  "expGain": 500,
  "duration": 3600,
  "capped": false
}
```

#### 预览离线收益

```http
GET /offline/preview
x-player-id: {playerId}
```

**响应**:
```json
{
  "estimatedRewards": [{ "itemId": "spirit_energy", "count": 1200 }],
  "estimatedExp": 500,
  "duration": 7200,
  "maxDuration": 43200,
  "willBeCapped": true
}
```

---

### ⚔️ 战斗模块

#### 切换流派

```http
POST /battle/switch-style
Content-Type: application/json
x-player-id: {playerId}

{
  "style": "sword_cultivator"
}
```

流派类型: `sword_cultivator`(剑修), `spell_cultivator`(法修), `body_cultivator`(体修)

#### 获取流派属性

```http
GET /battle/style-attributes
x-player-id: {playerId}
```

#### 创建队伍

```http
POST /battle/party/create
x-player-id: {playerId}
```

**响应**:
```json
{ "partyId": "party_xxx" }
```

#### 加入队伍

```http
POST /battle/party/join
Content-Type: application/json
x-player-id: {playerId}

{
  "partyId": "party_xxx"
}
```

#### 离开队伍

```http
POST /battle/party/leave
x-player-id: {playerId}
```

#### 进入九幽幻境

```http
POST /battle/dungeon/enter
x-player-id: {playerId}
```

**响应**:
```json
{
  "state": {
    "playerId": "xxx",
    "currentFloor": 1,
    "maxFloor": 50,
    "items": {
      "guiding_talisman": 10,
      "concealment_array": 2
    },
    "activeArrays": 0,
    "isActive": true
  },
  "message": "进入九幽幻境,当前位于第1层"
}
```

#### 使用幻境道具

```http
POST /battle/dungeon/use-item
Content-Type: application/json
x-player-id: {playerId}

{
  "itemType": "guiding_talisman"
}
```

道具类型: `guiding_talisman`(引路符), `concealment_array`(隐匿阵)

#### 获取幻境状态

```http
GET /battle/dungeon/status
x-player-id: {playerId}
```

---

### 🏯 仙府模块

#### 获取我的仙府

```http
GET /estate/my-estate
x-player-id: {playerId}
```

#### 拜访他人仙府

```http
GET /estate/visit?playerId={targetPlayerId}
x-player-id: {playerId}
```

#### 建造/升级建筑

```http
POST /estate/build
Content-Type: application/json
x-player-id: {playerId}

{
  "buildingType": "spirit_gathering"
}
```

建筑类型列表:
- `spirit_gathering` - 聚灵阵
- `herb_garden` - 灵药园
- `bamboo_forest` - 灵竹林
- `forge` - 炼器坊
- `talisman_room` - 制符室
- `weaving_room` - 织衣阁
- `kitchen` - 灵膳房
- `winery` - 酿酒窖
- `alchemy_room` - 炼丹房
- `nurturing_room` - 温养室
- `library` - 藏书阁
- `meditation_room` - 静室
- `warehouse` - 仓库
- `spirit_pool` - 灵泉

#### 加速建造

```http
POST /estate/boost
Content-Type: application/json
x-player-id: {playerId}

{
  "buildingType": "spirit_gathering"
}
```

#### 偷取灵气

```http
POST /estate/steal
Content-Type: application/json
x-player-id: {playerId}

{
  "targetPlayerId": "xxx"
}
```

**响应**:
```json
{
  "success": true,
  "amount": 100,
  "cooldown": 3600
}
```

#### 协助建造

```http
POST /estate/assist
Content-Type: application/json
x-player-id: {playerId}

{
  "targetPlayerId": "xxx",
  "buildingType": "spirit_gathering"
}
```

#### 获取访客记录

```http
GET /estate/visitor-logs
x-player-id: {playerId}
```

---

### 💰 坊市模块

#### 上架物品

```http
POST /market/sell
Content-Type: application/json
x-player-id: {playerId}

{
  "itemId": "sword_001",
  "itemCount": 1,
  "price": 10000,
  "currencyType": "spirit_stone"
}
```

#### 购买物品

```http
POST /market/buy
Content-Type: application/json
x-player-id: {playerId}

{
  "tradeId": "trade_xxx"
}
```

#### 获取市场列表

```http
GET /market/listings?page=1&pageSize=20
x-player-id: {playerId}
```

#### 下架物品

```http
POST /market/cancel
Content-Type: application/json
x-player-id: {playerId}

{
  "tradeId": "trade_xxx"
}
```

#### 创建拍卖

```http
POST /market/auction/create
Content-Type: application/json
x-player-id: {playerId}

{
  "itemId": "artifact_001",
  "itemCount": 1,
  "startPrice": 50000,
  "duration": 3600
}
```

#### 拍卖出价

```http
POST /market/auction/bid
Content-Type: application/json
x-player-id: {playerId}

{
  "auctionId": "auction_xxx",
  "amount": 55000
}
```

#### 获取拍卖列表

```http
GET /market/auction/list?page=1&pageSize=20
x-player-id: {playerId}
```

#### 获取我的拍卖

```http
GET /market/auction/my
x-player-id: {playerId}
```

#### 获取市场统计

```http
GET /market/stats
x-player-id: {playerId}
```

#### 获取交易历史

```http
GET /market/history?page=1&pageSize=20
x-player-id: {playerId}
```

---

### 🏥 健康检查

#### 基础健康检查

```http
GET /health
```

#### 详细状态

```http
GET /health/details
```

---

## WebSocket 事件

### 连接地址

```
ws://localhost:3000
```

### 命名空间

#### 组队通信 - `/party`

**加入队伍**:
```javascript
socket.emit('join-party', { partyId: 'xxx', playerId: 'xxx' });
```

**准备状态**:
```javascript
socket.emit('set-ready', { partyId: 'xxx', playerId: 'xxx', isReady: true });
```

**队伍聊天**:
```javascript
socket.emit('party-chat', { partyId: 'xxx', playerId: 'xxx', message: 'hello' });
```

**监听事件**:
```javascript
socket.on('member-joined', (data) => console.log(data));
socket.on('member-left', (data) => console.log(data));
socket.on('member-ready', (data) => console.log(data));
socket.on('chat-message', (data) => console.log(data));
```

#### 仙府通知 - `/estate`

**订阅仙府更新**:
```javascript
socket.emit('subscribe-estate', { playerId: 'xxx' });
```

**监听事件**:
```javascript
socket.on('estate-update', (data) => console.log(data));
socket.on('building-complete', (data) => console.log(data));
socket.on('visitor-arrived', (data) => console.log(data));
```

#### 市场通知 - `/trade`

**订阅市场**:
```javascript
socket.emit('subscribe-market', { itemTypes: ['weapon', 'armor'] });
```

**订阅拍卖**:
```javascript
socket.emit('subscribe-auction');
```

**监听事件**:
```javascript
socket.on('new-listing', (data) => console.log(data));
socket.on('trade-complete', (data) => console.log(data));
socket.on('new-auction', (data) => console.log(data));
socket.on('bid-update', (data) => console.log(data));
```

---

## 测试示例

使用 curl 测试登录:

```bash
# 1. 登录获取 playerId
curl -X POST http://localhost:3000/api/auth/wechat-login \
  -H "Content-Type: application/json" \
  -d '{"code": "test123"}'

# 2. 使用 playerId 访问其他接口
curl http://localhost:3000/api/player/profile \
  -H "x-player-id: {playerId}"
```

---

## 错误码说明

| Code | 说明 |
|------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |
