# WebSocket 连接问题排查指南

## `isTrusted: [Getter]` 说明

**这不是错误！** `isTrusted` 是 WebSocket 事件对象的标准属性，表示事件是否由用户操作触发。

如果你看到这个，说明连接本身是正常的，问题可能在其他地方。

---

## 常见连接问题及解决方案

### 1. 连接立即断开

**现象：**
```
连接成功 → 立即断开 → 不断重连
```

**原因和解决：**

#### A. JWT 认证失败
服务器配置要求所有 WebSocket 连接必须有有效 Token。

**解决方案：**
1. 先获取测试 Token：
```bash
curl "http://localhost:3000/api/test-auth/quick-token"
```

2. 使用 Token 连接：
```javascript
const socket = io('ws://localhost:3000/game', {
  query: { token: 'eyJhbGciOiJIUzI1NiIs...' }
});
```

#### B. 命名空间错误
确保使用正确的命名空间：
- `/test` - 测试网关（无需认证）
- `/game` - 消息网关（需要认证）
- `/party` - 组队网关（需要认证）

**测试连接：**
```javascript
// 先测试无需认证的 /test 命名空间
const socket = io('ws://localhost:3000/test');
```

### 2. CORS 跨域错误

**现象：**
```
Access to XMLHttpRequest has been blocked by CORS policy
```

**解决方案：**

服务器已配置 `cors: { origin: '*' }`，但如果仍然报错，检查：

1. 客户端使用 Socket.IO 而不是原生 WebSocket
2. 确保 transports 包含 'polling'

```javascript
const socket = io('ws://localhost:3000/test', {
  transports: ['websocket', 'polling'], // 允许降级
  withCredentials: false
});
```

### 3. 连接超时

**现象：**
```
Connection timeout / ETIMEDOUT
```

**检查：**
1. 服务器是否已启动
```bash
curl http://localhost:3000/api/health
```

2. 防火墙是否阻止了 3000 端口
3. 如果是远程服务器，检查 IP 和端口是否可访问

### 4. 原生 WebSocket vs Socket.IO

**重要：** 服务器使用 Socket.IO，不是原生 WebSocket！

❌ **错误：**
```javascript
// 原生 WebSocket 不能直接连接 Socket.IO 服务器
const ws = new WebSocket('ws://localhost:3000/game');
```

✅ **正确：**
```javascript
// 使用 Socket.IO 客户端
import { io } from 'socket.io-client';
const socket = io('ws://localhost:3000/game');
```

---

## 正确的客户端连接代码

### Cocos Creator 示例

```typescript
import { io } from 'socket.io-client';

export class NetworkManager {
  private socket: any = null;

  async connect(token?: string) {
    return new Promise((resolve, reject) => {
      // 测试环境可以连接 /test 无需认证
      const url = 'ws://localhost:3000/test';

      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        query: token ? { token } : undefined
      });

      this.socket.on('connect', () => {
        console.log('连接成功:', this.socket.id);
        resolve(true);
      });

      this.socket.on('connect_error', (error: any) => {
        console.error('连接错误:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log('断开连接:', reason);
      });

      // 监听消息
      this.socket.on('welcome', (data: any) => {
        console.log('收到欢迎:', data);
      });

      this.socket.on('pong', (data: any) => {
        console.log('收到 Pong:', data);
      });
    });
  }

  sendPing() {
    this.socket?.emit('ping', { time: Date.now() });
  }

  disconnect() {
    this.socket?.disconnect();
  }
}
```

### HTML 测试页面

直接打开 `docs/client-test.html` 进行测试：

```bash
# 方式1: 直接用浏览器打开
code docs/client-test.html

# 方式2: 使用本地服务器
cd docs
npx serve  # 或 python -m http.server 8080
# 然后访问 http://localhost:8080/client-test.html
```

---

## 快速诊断步骤

### Step 1: 检查服务器运行状态
```bash
curl http://localhost:3000/api/health
# 应该返回: { "status": "ok", ... }
```

### Step 2: 获取测试 Token
```bash
curl http://localhost:3000/api/test-auth/quick-token
```

### Step 3: 使用 HTML 测试页
打开 `docs/client-test.html`，输入：
- 服务器地址: `ws://localhost:3000/test`
- Token: 留空（测试网关不需要）

点击"连接"按钮，查看日志输出。

### Step 4: 检查服务器日志
服务器控制台应该显示：
```
[test] Test WebSocket Gateway initialized on namespace: /test
[test] Client connected: xxxx, total: 1
```

---

## 常见错误对照表

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `connection refused` | 服务器未启动 | 启动服务器 |
| `CORS policy` | 跨域限制 | 使用 Socket.IO 客户端 |
| `authentication error` | Token 无效 | 获取新的测试 Token |
| `namespace not found` | 命名空间错误 | 使用 /test, /game 等 |
| `transport error` | 传输层错误 | 允许 polling 降级 |
| `timeout` | 连接超时 | 检查网络/防火墙 |

---

## 测试网关 API

`/test` 命名空间提供以下事件：

### 客户端发送
- `ping` - 测试 ping/pong
- `echo` - 回显消息
- `broadcast` - 广播给所有客户端

### 服务器推送
- `welcome` - 连接成功欢迎消息
- `pong` - ping 的响应
- `echo` - echo 的响应
- `broadcast` - 广播消息

### 示例
```javascript
const socket = io('ws://localhost:3000/test');

socket.on('connect', () => {
  // 发送 ping
  socket.emit('ping', { message: 'hello' });
});

socket.on('pong', (data) => {
  console.log('收到:', data);
});
```
