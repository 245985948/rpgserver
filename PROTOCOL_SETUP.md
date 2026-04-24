# Protobuf 通信配置完成

## 完成情况

✅ 服务器端已更新支持 Protobuf + JSON 双协议
✅ 客户端 Cocos Creator 代码模板已创建
✅ 浏览器测试页面已创建
✅ 使用文档已编写

## 修改的文件（服务器端）

| 文件 | 修改内容 |
|------|----------|
| `src/modules/gateway/message.gateway.ts` | 支持 protobuf 和 json 自动检测、编解码 |
| `src/core/message-router.ts` | 添加详细的路由日志 |

## 新增的文件（客户端模板）

```
client-template/
├── network/
│   ├── index.ts              # 网络层导出
│   ├── GameConfig.ts         # 游戏配置
│   ├── MessageCodes.ts       # 消息号定义
│   ├── NetworkManager.ts     # WebSocket 核心管理器
│   └── GameClient.ts         # 业务层封装
├── proto/
│   └── game.proto            # 协议定义文件
├── examples/
│   ├── LoginScene.ts         # 登录场景示例
│   ├── MainScene.ts          # 主场景示例
│   └── NetworkTest.ts        # 网络测试组件
├── test.html                 # 浏览器测试页面
├── README.md                 # 使用文档
└── DEPLOY.md                 # 部署指南
```

## 快速测试

### 1. 启动服务器

```bash
cd D:\rpgServers
npm install  # 确保 protobufjs 已安装
npm run start:dev
```

### 2. 浏览器测试

用 Live Server 打开 `client-template/test.html`：

```bash
cd client-template
npx live-server --port=5500
```

浏览器访问 http://localhost:5500/test.html

### 3. 测试步骤

1. 点击"连接"按钮
2. 选择消息号 3001（获取玩家数据）
3. 点击"发送请求"
4. 查看响应结果

## 客户端集成到 Cocos Creator

### 步骤 1: 复制文件

将 `client-template/network/` 复制到 `assets/scripts/network/`

### 步骤 2: 引入 protobuf.js

在 `index.html` 中添加：
```html
<script src="https://cdn.jsdelivr.net/npm/protobufjs@7.2.5/dist/protobuf.min.js"></script>
```

### 步骤 3: 使用代码

```typescript
import { gameClient } from './network';

async start() {
    // 初始化连接
    await gameClient.init('proto/game.proto');

    // 登录
    const result = await gameClient.wechatLogin('wx_code');

    // 获取玩家数据
    const playerData = await gameClient.getPlayerData();

    // 监听推送
    gameClient.onCurrencyChange((data) => {
        console.log('货币变化:', data);
    });
}
```

## 通信协议

### 消息格式

```typescript
// 请求
{
    code: 3001,        // 消息号
    seq: 1,            // 序列号
    payload: {...},    // 数据
    timestamp: 123456  // 时间戳
}

// 响应
{
    code: 3002,        // 响应消息号
    seq: 1,            // 匹配的序列号
    payload: {...},    // 响应数据
    timestamp: 123456,
    processingTime: 5  // 处理耗时(ms)
}
```

### 支持的消息号

```typescript
// 系统
SystemCodes.HEARTBEAT_REQ      = 1001
SystemCodes.TIME_SYNC_REQ      = 1003

// 认证
AuthCodes.WECHAT_LOGIN_REQ     = 2001

// 玩家
PlayerCodes.GET_PLAYER_DATA_REQ = 3001
PlayerCodes.USE_ITEM_REQ       = 3005

// 推送
PushCodes.PLAYER_ATTR_CHANGED  = 8001
PushCodes.CURRENCY_CHANGED     = 8002
PushCodes.INVENTORY_CHANGED    = 8003
```

## 日志输出

服务器启动后，日志会显示：

```
[ProtobufService] Protobuf loaded from ...\game.proto
[MessageGateway] Message Gateway initialized
[MessageRouter] === Message Route Table ===
...
```

收到消息时：
```
[RECV] client=xxx | player=anonymous | code=3001 (GET_PLAYER_DATA_REQ) | seq=1 | format=protobuf | payload={}
[ROUTE] player=anonymous | code=3001 (GET_PLAYER_DATA_REQ) | seq=1 | requireAuth=true
[HANDLED] GET_PLAYER_DATA_REQ | seq=1 | 2ms
[SEND] client=xxx | player=anonymous | code=3002 (GET_PLAYER_DATA_RESP) | seq=1 | format=protobuf | 2ms
```

## 注意事项

1. **proto 文件路径**: 客户端需要能正确加载 `proto/game.proto`
2. **跨域**: 开发环境已允许所有来源，生产环境需要配置正确的 CORS
3. **协议降级**: 如果 protobuf 加载失败，会自动降级到 JSON
4. **心跳**: 客户端会自动发送心跳（30秒间隔）
5. **重连**: 网络断开会自动重连（最多5次）

## 下一步建议

1. 运行 `test.html` 验证服务器连接
2. 将客户端代码集成到 Cocos Creator
3. 根据实际业务扩展消息处理器（服务器端）
4. 添加更多 proto 消息类型
