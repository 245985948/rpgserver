# 游戏协议定义

客户端 (Cocos Creator + TypeScript) 和服务器 (NestJS) 共用的协议定义。

---

## 目录结构

```
shared/protocol/
├── index.ts          # 入口文件
├── message-codes.ts  # 消息号定义
├── types.ts          # 类型定义
└── README.md         # 本文档
```

---

## 使用方式

### 方式1: Git Submodule (推荐)

在 Cocos 项目中添加子模块：

```bash
cd your-cocos-project

git submodule add <server-repo-url>/shared/protocol.git assets/scripts/network/protocol

git submodule update --init --recursive
```

然后直接在代码中引用：

```typescript
import { PlayerCodes, IUseItemReq, IUseItemResp } from './network/protocol';
```

### 方式2: 软链接

```bash
# Windows (以管理员身份运行)
cd your-cocos-project\assets\scripts\network
mklink /D protocol D:\rpgServers\shared\protocol

# Mac/Linux
cd your-cocos-project/assets/scripts/network
ln -s /path/to/rpgServers/shared/protocol protocol
```

### 方式3: 手动复制

```bash
# 使用脚本自动同步
xcopy /E /I /Y D:\rpgServers\shared\protocol your-cocos-project\assets\scripts\network\protocol
```

---

## Cocos 项目使用示例

### 网络管理器

```typescript
// assets/scripts/network/NetworkManager.ts

import {
  SystemCodes,
  AuthCodes,
  PlayerCodes,
  ServerPushCodes,
  ErrorCodes,
  IRequestMessage,
  IResponseMessage,
  IPushMessage,
  getMessageName,
} from './protocol';

/** 请求 Promise 等待 */
interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout: number;
}

export class NetworkManager {
  private static instance: NetworkManager;
  private socket: WebSocket | null = null;
  private seq = 0;
  private pending = new Map<number, PendingRequest>();
  private heartbeatTimer: number = -1;

  static getInstance(): NetworkManager {
    if (!this.instance) {
      this.instance = new NetworkManager();
    }
    return this.instance;
  }

  /** 连接服务器 */
  connect(url: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Cocos Creator 中使用 WebSocket
      this.socket = new WebSocket(`${url}?token=${token}`);

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.startHeartbeat();
        resolve();
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.socket.onclose = () => {
        console.log('WebSocket closed');
        this.stopHeartbeat();
      };

      this.socket.onerror = (err) => {
        reject(err);
      };
    });
  }

  /** 发送请求并等待响应 */
  request<TReq, TResp>(
    code: number,
    payload: TReq,
    timeout = 10000
  ): Promise<TResp> {
    return new Promise((resolve, reject) => {
      const seq = ++this.seq;

      // 设置超时
      const timer = setTimeout(() => {
        this.pending.delete(seq);
        reject(new Error(`Request timeout: ${code} seq=${seq}`));
      }, timeout);

      this.pending.set(seq, { resolve, reject, timeout: timer });

      // 发送消息
      const message: IRequestMessage<TReq> = {
        code,
        seq,
        payload,
        timestamp: Date.now(),
      };

      this.socket?.send(JSON.stringify(message));
      console.log(`[SEND] ${getMessageName(code)} seq=${seq}`);
    });
  }

  /** 处理收到的消息 */
  private handleMessage(msg: any): void {
    const { code, seq, payload, error } = msg;

    console.log(`[RECV] ${getMessageName(code)} seq=${seq}`);

    // 响应消息
    if (seq > 0 && this.pending.has(seq)) {
      const pending = this.pending.get(seq)!;
      clearTimeout(pending.timeout);
      this.pending.delete(seq);

      if (error) {
        pending.reject(error);
      } else {
        pending.resolve(payload);
      }
      return;
    }

    // 推送消息
    this.handlePush(code, payload);
  }

  /** 处理推送 */
  private handlePush(code: number, payload: any): void {
    switch (code) {
      case ServerPushCodes.PLAYER_ATTR_CHANGED:
        cc.director.emit('PlayerAttrChanged', payload);
        break;
      case ServerPushCodes.CURRENCY_CHANGED:
        cc.director.emit('CurrencyChanged', payload);
        break;
      // ... 其他推送
    }
  }

  /** 心跳 */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.request(SystemCodes.HEARTBEAT_REQ, {})
        .then((resp: { serverTime: number }) => {
          const delay = Date.now() - resp.serverTime;
          console.log(`Heartbeat delay: ${delay}ms`);
        })
        .catch(console.error);
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer >= 0) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = -1;
    }
  }
}
```

### API 封装

```typescript
// assets/scripts/network/GameAPI.ts

import { NetworkManager } from './NetworkManager';
import {
  AuthCodes,
  PlayerCodes,
  EconomyCodes,
  IWechatLoginReq,
  IWechatLoginResp,
  IGetPlayerDataResp,
  IUseItemReq,
  IUseItemResp,
  IBuyItemReq,
  IBuyItemResp,
  // ... 其他类型
} from './protocol';

export class GameAPI {
  private net = NetworkManager.getInstance();

  // ========== 认证 ==========

  /** 微信登录 */
  wechatLogin(code: string): Promise<IWechatLoginResp> {
    return this.net.request<IWechatLoginReq, IWechatLoginResp>(
      AuthCodes.WECHAT_LOGIN_REQ,
      { code }
    );
  }

  // ========== 玩家 ==========

  /** 获取玩家数据 */
  getPlayerData(): Promise<IGetPlayerDataResp> {
    return this.net.request<any, IGetPlayerDataResp>(
      PlayerCodes.GET_PLAYER_DATA_REQ,
      {}
    );
  }

  /** 使用物品 */
  useItem(itemId: string, quantity = 1): Promise<IUseItemResp> {
    return this.net.request<IUseItemReq, IUseItemResp>(
      PlayerCodes.USE_ITEM_REQ,
      { itemId, quantity }
    );
  }

  // ========== 经济 ==========

  /** 购买物品 */
  buyItem(tradeId: string): Promise<IBuyItemResp> {
    return this.net.request<IBuyItemReq, IBuyItemResp>(
      EconomyCodes.BUY_ITEM_REQ,
      { tradeId }
    );
  }
}

export const gameAPI = new GameAPI();
```

### 在组件中使用

```typescript
// assets/scripts/ui/ShopUI.ts

import { _decorator, Component } from 'cc';
import { gameAPI } from '../network/GameAPI';
import { ServerPushCodes } from '../network/protocol';

const { ccclass, property } = _decorator;

@ccclass('ShopUI')
export class ShopUI extends Component {
  @property(cc.Label)
  goldLabel: cc.Label | null = null;

  onLoad() {
    // 监听货币变更推送
    cc.director.on(ServerPushCodes.CURRENCY_CHANGED, this.onCurrencyChanged, this);
  }

  onDestroy() {
    cc.director.off(ServerPushCodes.CURRENCY_CHANGED, this.onCurrencyChanged, this);
  }

  /** 购买按钮点击 */
  async onBuyClick(tradeId: string) {
    try {
      const result = await gameAPI.buyItem(tradeId);
      console.log('购买成功:', result);
      // 显示成功提示
    } catch (error) {
      console.error('购买失败:', error);
      // 显示错误提示
    }
  }

  /** 货币变更处理 */
  onCurrencyChanged(data: { currencyType: string; newValue: number }) {
    if (data.currencyType === 'spiritStones') {
      this.goldLabel!.string = data.newValue.toString();
    }
  }
}
```

---

## tsconfig.json 配置

确保 Cocos 项目的 `tsconfig.json` 包含协议目录：

```json
{
  "compilerOptions": {
    "target": "ES2015",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true
  },
  "include": [
    "assets/**/*",
    "shared/protocol/**/*"  // 如果使用软链接
  ]
}
```

---

## 注意事项

1. **路径别名**: 可以在 `tsconfig.json` 中设置别名简化引用：
   ```json
   "paths": {
     "@protocol/*": ["assets/scripts/network/protocol/*"]
   }
   ```

2. **代码提示**: 所有类型都有完整的 TypeScript 类型定义，IDE 会自动提示。

3. **同步更新**: 修改协议后需要同步到客户端：
   ```bash
   # 如果使用 submodule
git submodule update --remote

   # 如果使用软链接，无需额外操作
   # 如果使用复制，重新执行复制脚本
   ```
