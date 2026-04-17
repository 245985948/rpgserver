# 太墟修仙录 - Cocos Creator 客户端网络层

## 文件结构

```
client-template/
├── network/              # 网络层代码
│   ├── index.ts         # 导出文件
│   ├── GameConfig.ts    # 游戏配置
│   ├── MessageCodes.ts  # 消息号定义
│   ├── NetworkManager.ts # WebSocket 管理器
│   └── GameClient.ts    # 业务层封装
├── proto/
│   └── game.proto       # protobuf 协议定义
└── examples/            # 使用示例
    ├── NetworkTest.ts   # 网络测试组件
    └── LoginScene.ts    # 登录场景示例
```

## 快速开始

### 1. 引入 protobuf.js

在 `index.html` 或 Cocos Creator 的脚本中引入 protobuf.js：

```html
<script src="https://cdn.jsdelivr.net/npm/protobufjs@7.2.5/dist/protobuf.min.js"></script>
```

或下载到项目中：
```bash
npm install protobufjs
```

### 2. 复制网络层代码

将 `network/` 目录复制到 Cocos Creator 项目的 `assets/scripts/` 下。

### 3. 初始化连接

```typescript
import { gameClient, NetworkState } from './network';

// 在场景脚本中
async start() {
    try {
        // 初始化 protobuf 并连接服务器
        await gameClient.init(
            'proto/game.proto',  // proto 文件路径
            'ws://localhost:3000/game',  // WebSocket URL
            'your-jwt-token'     // 可选的认证令牌
        );
        console.log('连接成功！');
    } catch (error) {
        console.error('连接失败:', error);
    }
}
```

### 4. 发送请求

```typescript
// 登录
const result = await gameClient.wechatLogin('wx_code_xxx');
console.log('登录成功:', result.playerData);

// 获取玩家数据
const playerData = await gameClient.getPlayerData();
console.log('玩家数据:', playerData);

// 使用物品
const result = await gameClient.useItem('item_001', 5);
console.log('使用物品结果:', result);
```

### 5. 监听推送

```typescript
// 在 start 中设置监听
gameClient.onAttributeChange((changes) => {
    console.log('属性变化:', changes);
});

gameClient.onCurrencyChange((data) => {
    console.log(`货币变化: ${data.currencyType} ${data.delta}`);
});

gameClient.onBattleState((state) => {
    console.log('战斗状态更新:', state);
});
```

## API 参考

### GameClient

| 方法 | 说明 |
|------|------|
| `init(protoUrl, wsUrl?, token?)` | 初始化并连接服务器 |
| `disconnect()` | 断开连接 |
| `isConnected()` | 是否已连接 |
| `wechatLogin(code)` | 微信登录 |
| `logout()` | 登出 |
| `getPlayerData()` | 获取玩家数据 |
| `useItem(itemId, quantity)` | 使用物品 |
| `updateNickname(nickname)` | 更新昵称 |
| `enterDungeon(dungeonId)` | 进入副本 |
| `battleAction(action, targetId?, skillId?)` | 战斗行动 |
| `getMarketList(itemType?)` | 获取市场列表 |
| `buyItem(listingId)` | 购买物品 |
| `sellItem(itemId, quantity, price)` | 出售物品 |
| `getEstateData()` | 获取仙府数据 |
| `upgradeBuilding(buildingId)` | 升级建筑 |
| `collectSpirit()` | 收集灵气 |

### NetworkManager (底层)

```typescript
import { network } from './network';

// 连接
await network.connect('ws://localhost:3000/game');

// 发送请求并等待响应
const response = await network.request(3001, { playerId: 'xxx' });

// 发送通知（不等待响应）
network.notify(1001, {}); // 心跳

// 监听推送消息
network.on(8001, (payload) => {
    console.log('收到推送:', payload);
});

// 设置连接状态回调
network.setOnConnect(() => console.log('已连接'));
network.setOnDisconnect(() => console.log('已断开'));
network.setOnError((err) => console.error('错误:', err));
```

## 消息号定义

```typescript
import {
    SystemCodes,
    AuthCodes,
    PlayerCodes,
    BattleCodes,
    EconomyCodes,
    EstateCodes,
    PushCodes
} from './network';

// 系统
SystemCodes.HEARTBEAT_REQ        // 1001
SystemCodes.HEARTBEAT_RESP       // 1002

// 认证
AuthCodes.WECHAT_LOGIN_REQ       // 2001
AuthCodes.WECHAT_LOGIN_RESP      // 2002

// 玩家
PlayerCodes.GET_PLAYER_DATA_REQ  // 3001
PlayerCodes.GET_PLAYER_DATA_RESP // 3002

// 推送
PushCodes.PLAYER_ATTR_CHANGED    // 8001
PushCodes.CURRENCY_CHANGED       // 8002
PushCodes.INVENTORY_CHANGED      // 8003
```

## 配置

修改 `GameConfig.ts` 来调整配置：

```typescript
export const GameConfig = {
    WS_SERVER_URL: 'ws://localhost:3000/game',
    USE_PROTOBUF: true,           // 是否使用 protobuf
    HEARTBEAT_INTERVAL: 30000,    // 心跳间隔
    REQUEST_TIMEOUT: 10000,       // 请求超时
    RECONNECT: {
        maxAttempts: 5,           // 最大重连次数
        delay: 3000,              // 初始重连延迟
        backoffMultiplier: 1.5,   // 退避倍数
    },
};
```

## 注意事项

1. **proto 文件路径**: 确保 `game.proto` 文件能被正确加载
2. **跨域问题**: 开发时确保服务器开启了 CORS
3. **断线重连**: 网络层会自动重连，业务层可以通过 `setOnConnect`/`setOnDisconnect` 监听状态
4. **超时处理**: 请求默认 10 秒超时，可以在 `GameConfig` 中调整

## 调试

在浏览器控制台查看网络日志：

```
[Network] Connecting to ws://localhost:3000/game...
[Network] WebSocket connected
[Network] SEND code=WECHAT_LOGIN_REQ seq=1 {code: "xxx"}
[Network] RECV code=WECHAT_LOGIN_RESP seq=1 format=protobuf {...}
```

## 协议格式

### JSON 格式

```json
{
    "code": 3001,
    "seq": 1,
    "payload": { "playerId": "xxx" },
    "timestamp": 1234567890
}
```

### Protobuf 格式

使用 `taixu.WebSocketMessage` 包装：

```protobuf
message WebSocketMessage {
    string event = 1;
    bytes payload = 2;  // JSON 序列化后的数据
    int64 timestamp = 3;
    int32 seq = 4;
}
```

服务器会自动检测消息格式并正确解析。
