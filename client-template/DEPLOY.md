# Protobuf 通信部署指南

## 服务器端

### 1. 确保 proto 文件存在

```
src/shared/proto/game.proto
```

### 2. 安装依赖

```bash
cd D:\rpgServers
npm install protobufjs
```

### 3. 启动服务器

```bash
npm run start:dev
```

服务器日志应显示：
```
[ProtobufService] Protobuf loaded from ...\game.proto
[MessageGateway] Message Gateway initialized
```

## 客户端

### 方法一：浏览器测试（推荐先测试）

1. 打开 `client-template/test.html`
2. 或用 Live Server 启动：
   ```bash
   cd client-template
   npx live-server --port=5500
   ```
3. 浏览器访问 `http://localhost:5500/test.html`
4. 点击"连接"按钮测试

### 方法二：Cocos Creator

#### 步骤 1: 复制文件

将以下文件复制到 Cocos Creator 项目的 `assets/scripts/` 目录：

```
assets/scripts/
├── network/
│   ├── index.ts
│   ├── GameConfig.ts
│   ├── MessageCodes.ts
│   ├── NetworkManager.ts
│   └── GameClient.ts
└── proto/
    └── game.proto
```

#### 步骤 2: 引入 protobuf.js

**方式 A - CDN（开发测试）:**

在项目根目录的 `index.html` 中添加：
```html
<head>
    <script src="https://cdn.jsdelivr.net/npm/protobufjs@7.2.5/dist/protobuf.min.js"></script>
</head>
```

**方式 B - 本地文件（推荐生产）:**

1. 下载 protobuf.min.js：
   ```bash
   npm install protobufjs
   cp node_modules/protobufjs/dist/protobuf.min.js assets/scripts/network/
   ```

2. 在 `index.html` 中引入：
   ```html
    <script src="src/scripts/network/protobuf.min.js"></script>
    ```

#### 步骤 3: 配置服务器地址

修改 `network/GameConfig.ts`：
```typescript
export const GameConfig = {
    WS_SERVER_URL: 'ws://your-server-ip:3000/game',
    USE_PROTOBUF: true,
    // ...
};
```

#### 步骤 4: 使用网络层

```typescript
import { _decorator, Component } from 'cc';
import { gameClient } from './network';

const { ccclass, property } = _decorator;

@ccclass('MainScene')
export class MainScene extends Component {
    async start() {
        // 初始化网络
        await gameClient.init(
            'proto/game.proto',
            'ws://localhost:3000/game'
        );

        // 登录
        const result = await gameClient.wechatLogin('wx_code');
        console.log('登录成功:', result);

        // 获取玩家数据
        const playerData = await gameClient.getPlayerData();
        console.log('玩家数据:', playerData);

        // 监听推送
        gameClient.onCurrencyChange((data) => {
            console.log('货币变化:', data);
        });
    }
}
```

## 跨域配置

如果客户端和服务器在不同域名/端口，需要配置 CORS：

### 开发环境（已配置）

服务器 `message.gateway.ts` 中已配置：
```typescript
@WebSocketGateway({
    cors: {
        origin: '*',  // 允许所有来源
        credentials: false,
    },
})
```

### 生产环境

修改 `main.ts` 添加 HTTP CORS：
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        cors: {
            origin: ['https://your-game-domain.com'],
            credentials: true,
        },
    });
    await app.listen(3000);
}
bootstrap();
```

## 测试验证

### 1. 浏览器测试

打开 `test.html`，按以下顺序测试：

1. 点击"连接" - 应显示"已连接到服务器"
2. 选择消息号 1001 (心跳)
3. 点击"发送请求" - 应收到响应
4. 选择消息号 3001 (获取玩家数据)
5. 点击"发送请求" - 应返回玩家数据

### 2. Cocos Creator 测试

在场景中创建一个按钮，绑定以下脚本：

```typescript
import { _decorator, Component, Button, Label } from 'cc';
import { gameClient } from './network';

const { ccclass, property } = _decorator;

@ccclass('TestButton')
export class TestButton extends Component {
    @property(Label)
    resultLabel: Label | null = null;

    async onLoad() {
        // 初始化
        await gameClient.init('proto/game.proto');
    }

    async onButtonClick() {
        try {
            const data = await gameClient.getPlayerData();
            this.resultLabel!.string = JSON.stringify(data, null, 2);
        } catch (error) {
            this.resultLabel!.string = 'Error: ' + error;
        }
    }
}
```

## 常见问题

### Q: protobuf.js 加载失败

**A:** 检查 `index.html` 中是否正确引入了 protobuf.js：
```html
<script src="https://cdn.jsdelivr.net/npm/protobufjs@7.2.5/dist/protobuf.min.js"></script>
```

### Q: 连接失败

**A:**
1. 检查服务器是否运行
2. 检查防火墙设置
3. 检查 WebSocket URL 是否正确
4. 查看浏览器控制台网络日志

### Q: 消息发送成功但没有响应

**A:**
1. 检查消息号是否正确
2. 查看服务器日志是否有 `[RECV]` 日志
3. 检查 payload 格式是否正确

### Q: Protobuf 解析失败，自动降级到 JSON

**A:** 这是正常行为。检查 proto 文件路径是否正确，如果 protobuf 加载失败会自动使用 JSON。

## 协议说明

### 消息格式

**请求：**
```json
{
    "code": 3001,
    "seq": 1,
    "payload": {},
    "timestamp": 1234567890
}
```

**响应：**
```json
{
    "code": 3002,
    "seq": 1,
    "payload": {...},
    "timestamp": 1234567890,
    "processingTime": 5
}
```

### Protobuf 封装

WebSocket 消息使用 `taixu.WebSocketMessage` 封装：
```protobuf
message WebSocketMessage {
    string event = 1;
    bytes payload = 2;  // JSON 序列化后的数据
    int64 timestamp = 3;
    int32 seq = 4;
}
```

服务器自动检测消息格式（protobuf 或 json）并正确处理。
