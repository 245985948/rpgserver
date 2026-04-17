# /game 命名空间连接问题修复

## 问题原因

/game 命名空间需要 JWT Token 才能连接，而 /test 不需要。

## 修复内容

### 1. GatewayModule 缺少依赖（已修复）

```typescript
// 之前缺少的导入
imports: [
  JwtModule,        // 提供 JwtService
  ProtobufModule,   // 提供 ProtobufService
],
```

### 2. WebSocket CORS 配置优化（已修复）

```typescript
@WebSocketGateway({
  namespace: 'game',
  cors: {
    origin: '*',
    credentials: false,  // 明确设置
  },
  transports: ['websocket', 'polling'],  // 允许降级
})
```

## 连接方式

### 方式1: 使用测试 Token

```bash
# 1. 获取测试 Token
curl "http://localhost:3000/api/test-auth/quick-token"

# 2. 使用 Token 连接 WebSocket
```

### 方式2: JavaScript 连接示例

```javascript
import { io } from 'socket.io-client';

// 先获取 Token
const res = await fetch('http://localhost:3000/api/test-auth/quick-token');
const { tokens } = await res.json();

// 连接 game 命名空间
const socket = io('ws://localhost:3000/game', {
  transports: ['websocket', 'polling'],
  query: { token: tokens.accessToken }
});

socket.on('connect', () => {
  console.log('连接成功:', socket.id);
});

socket.on('connect_error', (err) => {
  console.error('连接错误:', err.message);
});

// 发送消息
socket.emit('message', {
  code: 2000,  // GET_PLAYER_DATA_REQ
  seq: 1,
  payload: {},
  timestamp: Date.now()
});

// 接收响应
socket.on('message', (data) => {
  console.log('收到:', data);
});
```

## 诊断步骤

### 步骤1: 使用诊断工具

打开 `docs/diagnose-ws.html`，分别测试：
1. **/test** - 应该能连接（免认证）
2. **/game** - 需要提供 Token

### 步骤2: 检查服务器日志

正常连接日志：
```
[MessageGateway] Client connected to /game: xxxxxx, player: anonymous
[MessageGateway] Client connected to /game: xxxxxx, player: test_123
```

### 步骤3: 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| /test 能连，/game 不能 | 缺少 Token | 获取测试 Token 后连接 |
| 连接后立即断开 | Token 无效 | 重新获取 Token |
| CORS 错误 | 配置问题 | 使用 Socket.IO 客户端 |

## 测试命令

```bash
# 1. 启动服务器
npm run start:dev

# 2. 获取 Token
curl http://localhost:3000/api/test-auth/quick-token

# 3. 使用 HTML 诊断工具
open docs/diagnose-ws.html
```

## 免认证快速测试

如果你想临时禁用 /game 的认证（仅用于测试），可以修改 `message.gateway.ts`：

```typescript
// 在 handleConnection 中添加免认证逻辑
handleConnection(client: IAuthenticatedSocket) {
  // 测试环境允许匿名
  const playerId = client.data?.playerId || `anonymous_${Date.now()}`;

  // ... 后续逻辑
}
```

**注意**: 生产环境必须要求有效 Token！
