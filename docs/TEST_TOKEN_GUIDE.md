# 测试环境 Token 获取指南

## 快速获取测试 Token

### 1. 一键获取测试 Token

```bash
curl "http://localhost:3000/api/test-auth/quick-token"
```

返回示例：
```json
{
  "message": "这是测试环境的临时 Token，生产环境不可用",
  "playerId": "test_1709000000000",
  "nickname": "测试玩家_123",
  "level": 50,
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 7200,
    "tokenType": "Bearer"
  },
  "usage": {
    "http": "Authorization: Bearer eyJhbGci...",
    "websocket": "ws://localhost:3000/game?token=eyJhbGci..."
  }
}
```

### 2. 指定玩家信息

```bash
# 指定玩家ID
curl "http://localhost:3000/api/test-auth/quick-token?playerId=my_test_id"

# 指定昵称和等级
curl "http://localhost:3000/api/test-auth/quick-token?nickname=大佬&level=100"
```

### 3. 模拟登录 (POST)

```bash
curl -X POST "http://localhost:3000/api/test-auth/mock-login" \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "test_001",
    "nickname": "测试玩家",
    "level": 50
  }'
```

---

## 在 Cocos 中使用测试 Token

```typescript
// 测试环境快速连接
async function testConnect() {
  // 1. 获取测试 Token
  const res = await fetch('http://localhost:3000/api/test-auth/quick-token');
  const { tokens } = await res.json();

  // 2. 连接 WebSocket
  const socket = new WebSocket(
    `ws://localhost:3000/game?token=${tokens.accessToken}`
  );

  // 3. 发送测试消息
  socket.onopen = () => {
    socket.send(JSON.stringify({
      code: 0,  // 心跳
      seq: 1,
      payload: {},
      timestamp: Date.now()
    }));
  };
}
```

---

## 测试接口一览

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/test-auth/quick-token` | GET | 快速获取测试 Token |
| `/api/test-auth/mock-login` | POST | 模拟登录 |
| `/api/test-auth/ws-info` | GET | WebSocket 连接信息 |
| `/api/test-auth/verify` | GET | 验证 Token |

---

## 免 Token 接口

以下接口在测试环境不需要 Token：

- `POST /api/auth/wechat-login` - 微信登录
- `POST /api/auth/refresh-token` - 刷新 Token
- `/api/test-auth/*` - 所有测试接口
- `/api/health` - 健康检查

---

## 生产环境注意

**测试接口仅在以下环境可用：**
- `development`
- `test`
- `dev`

生产环境会返回：
```json
{
  "statusCode": 401,
  "message": "此接口仅在测试环境可用"
}
```

---

## 快速测试脚本

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "1. 获取测试 Token..."
TOKEN_RESPONSE=$(curl -s "$BASE_URL/test-auth/quick-token?nickname=测试玩家")
TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:50}..."

echo ""
echo "2. 获取玩家数据..."
curl -s "$BASE_URL/player/profile" \
  -H "Authorization: Bearer $TOKEN" | head -c 500

echo ""
echo "3. 连接 WebSocket..."
echo "ws://localhost:3000/game?token=$TOKEN"
```
