# 游戏消息协议规范

## 概述

本文档定义了服务器和客户端之间的消息协议规范，包括消息号的分配规则、命名规范和通信流程。

---

## 消息号分配规则

### 号段划分

| 号段范围 | 用途 | 说明 |
|---------|------|------|
| 000000 - 000999 | 系统级消息 | 心跳、错误、时间同步 |
| 001000 - 001999 | 认证模块 | 登录、登出、Token刷新 |
| 002000 - 002999 | 玩家模块 | 玩家数据、背包、装备 |
| 003000 - 003999 | 战斗模块 | 战斗、副本、组队 |
| 004000 - 004999 | 经济模块 | 交易、拍卖、市场 |
| 005000 - 005999 | 仙府模块 | 建筑、生产、访问 |
| 006000 - 006999 | 社交模块 | 好友、聊天、邮件 |
| 900000 - 999999 | 服务器推送 | 属性变更、事件通知 |

### 奇偶规则

```
请求消息: 偶数 (0, 2, 4, 6...)
响应消息: 奇数 (1, 3, 5, 7...)

示例:
WECHAT_LOGIN_REQ  = 1000
WECHAT_LOGIN_RESP = 1001

START_BATTLE_REQ  = 3000
START_BATTLE_RESP = 3001
```

### 新增消息号的流程

1. **确定模块**: 根据功能确定所属的模块
2. **查找空位**: 在该模块的号段内找到未使用的偶数
3. **命名**: 使用 `动作_对象_REQ/RESP` 的命名格式
4. **更新常量**: 在 `message-codes.ts` 中添加新消息号
5. **生成客户端代码**: 运行代码生成工具同步到客户端

---

## 消息格式

### 请求消息 (客户端 → 服务器)

```json
{
  "code": 2004,
  "seq": 12345,
  "payload": {
    "itemId": "item_001",
    "quantity": 5
  },
  "timestamp": 1709000000000
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | number | 消息号 |
| seq | number | 序列号，用于请求-响应匹配 |
| payload | object | 业务数据 |
| timestamp | number | 客户端时间戳 |

### 响应消息 (服务器 → 客户端)

```json
{
  "code": 2005,
  "seq": 12345,
  "payload": {
    "success": true,
    "remaining": 10
  },
  "timestamp": 1709000000123,
  "processingTime": 15
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | number | 消息号 (请求码 + 1) |
| seq | number | 与请求相同的序列号 |
| payload | object | 响应数据 |
| timestamp | number | 服务器时间戳 |
| processingTime | number | 处理耗时(ms) |

### 错误响应

```json
{
  "code": 2005,
  "seq": 12345,
  "payload": null,
  "error": {
    "code": 4001,
    "message": "物品不足"
  },
  "timestamp": 1709000000123
}
```

### 服务器推送

```json
{
  "code": 900000,
  "seq": 0,
  "payload": {
    "changes": [
      { "field": "level", "oldValue": 49, "newValue": 50 }
    ]
  },
  "timestamp": 1709000000123
}
```

推送消息的 `seq` 固定为 0。

---

## 代码约定

### 服务器端 (TypeScript)

```typescript
// 1. 使用消息号常量
import { PlayerCodes, ErrorCodes } from '../shared/constants/message-codes';

// 2. 注册消息处理器
this.messageRouter.register(
  PlayerCodes.USE_ITEM_REQ,
  async (message) => {
    const { itemId, quantity } = message.payload;
    // 处理逻辑
    return { success: true, remaining: newQuantity };
  },
  { requireAuth: true, rateLimit: 10 }
);

// 3. 发送推送
this.gateway.pushToPlayer(playerId, ServerPushCodes.INVENTORY_CHANGED, {
  itemId,
  delta: -quantity,
  newQuantity
});
```

### 客户端 (Unity C#)

```csharp
// 1. 使用消息号常量
using TaiXu.Protocol;

// 2. 发送请求
var request = new {
    code = MessageCodes.Player.USE_ITEM_REQ,
    seq = GetNextSeq(),
    payload = new { itemId = "item_001", quantity = 5 }
};
SendMessage(request);

// 3. 处理响应
void OnMessage(int code, JObject payload) {
    switch (code) {
        case MessageCodes.Player.USE_ITEM_RESP:
            HandleUseItemResponse(payload);
            break;
        case MessageCodes.ServerPush.INVENTORY_CHANGED:
            HandleInventoryChanged(payload);
            break;
    }
}
```

### 客户端 (Lua - 微信小游戏)

```lua
-- 1. 使用消息号常量
local Codes = require("message_codes")

-- 2. 发送请求
sendMessage({
    code = Codes.Player.USE_ITEM_REQ,
    seq = getNextSeq(),
    payload = { itemId = "item_001", quantity = 5 }
})

-- 3. 处理响应
function onMessage(msg)
    if msg.code == Codes.Player.USE_ITEM_RESP then
        handleUseItemResp(msg.payload)
    elseif msg.code == Codes.ServerPush.INVENTORY_CHANGED then
        handleInventoryChanged(msg.payload)
    end
end
```

---

## 代码生成

### 生成命令

```bash
# 使用默认配置生成
node tools/generate-message-codes.js

# 使用自定义配置生成
node tools/generate-message-codes.js ./config/protocol.yaml ./output
```

### 输出文件

- `message-codes.generated.ts` - TypeScript 常量定义
- `MessageCodes.cs` - C# 常量定义 (Unity)
- `message_codes.lua` - Lua 表定义 (微信小游戏)

---

## 版本管理

### 协议版本号

在消息头中包含协议版本号：

```json
{
  "code": 2000,
  "seq": 12345,
  "version": "1.2.0",
  "payload": { ... }
}
```

### 兼容性规则

1. **向后兼容**: 新增消息号不会影响旧版本客户端
2. **废弃消息**: 保留消息号但标记为 `@deprecated`
3. **版本协商**: 登录时协商支持的协议版本

---

## 调试工具

### 日志输出

```
[REQ] USE_ITEM_REQ (2004) seq=12345 player=xxx
[RESP] USE_ITEM_RESP (2005) seq=12345 15ms
[PUSH] INVENTORY_CHANGED (900002) to player xxx
[BROADCAST] SERVER_NOTICE (900010)
```

### 消息号查询

```typescript
import { getMessageName, getMessageModule } from './message-codes';

getMessageName(2004);    // "USE_ITEM_REQ"
getMessageModule(2004);  // "PLAYER"
isRequest(2004);         // true
isResponse(2005);        // true
```

---

## 最佳实践

1. **命名规范**: 使用 `动词_名词_REQ/RESP` 格式
2. **批量操作**: 避免为单个功能创建过多消息号
3. **错误处理**: 统一使用错误码，避免在 payload 中混合错误信息
4. **心跳机制**: 保持心跳间隔 30 秒，超时 90 秒断开连接
5. **序列号管理**: 客户端维护递增序列号，用于请求-响应匹配和防重放
