# Cocos Creator 集成指南

本指南介绍如何在 Cocos Creator 项目中使用服务器的协议定义。

---

## 方案选择

### 方案1: 脚本同步 (推荐)

最简单的方式，每次协议更新后运行脚本同步。

```bash
cd D:/rpgServers
node tools/sync-protocol.js D:/CocosProjects/TaiXuClient
```

### 方案2: Git Submodule

将 `shared/protocol` 作为子模块添加到 Cocos 项目。

```bash
cd D:/CocosProjects/TaiXuClient

git submodule add <server-repo-url>#shared/protocol assets/scripts/network/protocol
```

### 方案3: 软链接 (开发环境推荐)

创建符号链接，修改服务器协议后客户端立即生效。

**Windows (管理员权限):**
```cmd
cd D:\CocosProjects\TaiXuClient\assets\scripts\network
mklink /D protocol D:\rpgServers\shared\protocol
```

**Mac/Linux:**
```bash
cd /path/to/TaiXuClient/assets/scripts/network
ln -s /path/to/rpgServers/shared/protocol protocol
```

---

## 目录结构

同步后 Cocos 项目的目录结构：

```
assets/scripts/network/
├── protocol/              # 从服务器同步的协议定义
│   ├── index.ts
│   ├── message-codes.ts
│   ├── types.ts
│   └── README.md
├── NetworkManager.ts      # 网络管理器
└── GameAPI.ts            # 游戏 API 封装
```

---

## 完整示例代码

### 1. 网络管理器

```typescript
// assets/scripts/network/NetworkManager.ts

import {
  SystemCodes,
  AuthCodes,
  PlayerCodes,
  ServerPushCodes,
  IRequestMessage,
  getMessageName,
} from './protocol';

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

  static getInstance(): NetworkManager {
    if (!this.instance) {
      this.instance = new NetworkManager();
    }
    return this.instance;
  }

  /** 连接服务器 */
  connect(url: string, token: string): Promise<void> {
    return new Promise((resolve, reject) => {
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

      this.socket.onerror = reject;
    });
  }

  /** 发送请求 */
  request<TReq, TResp>(code: number, payload: TReq, timeout = 10000): Promise<TResp> {
    return new Promise((resolve, reject) => {
      const seq = ++this.seq;

      const timer = setTimeout(() => {
        this.pending.delete(seq);
        reject(new Error(`Timeout: ${code}`));
      }, timeout);

      this.pending.set(seq, { resolve, reject, timeout: timer });

      const message: IRequestMessage<TReq> = {
        code,
        seq,
        payload,
        timestamp: Date.now(),
      };

      this.socket?.send(JSON.stringify(message));
    });
  }

  /** 处理收到的消息 */
  private handleMessage(msg: any): void {
    const { code, seq, payload, error } = msg;

    // 响应
    if (seq > 0 && this.pending.has(seq)) {
      const pending = this.pending.get(seq)!;
      clearTimeout(pending.timeout);
      this.pending.delete(seq);

      error ? pending.reject(error) : pending.resolve(payload);
      return;
    }

    // 推送
    this.handlePush(code, payload);
  }

  /** 处理推送 */
  private handlePush(code: number, payload: any): void {
    // 使用 Cocos 事件系统分发
    if (code === ServerPushCodes.PLAYER_ATTR_CHANGED) {
      cc.director.emit('PlayerAttrChanged', payload);
    } else if (code === ServerPushCodes.CURRENCY_CHANGED) {
      cc.director.emit('CurrencyChanged', payload);
    }
    // ... 其他推送
  }

  /** 心跳 */
  private startHeartbeat(): void {
    setInterval(() => {
      this.request(SystemCodes.HEARTBEAT_REQ, {});
    }, 30000);
  }

  private stopHeartbeat(): void {
    // 清理定时器
  }
}
```

### 2. API 封装

```typescript
// assets/scripts/network/GameAPI.ts

import { NetworkManager } from './NetworkManager';
import {
  AuthCodes,
  PlayerCodes,
  EconomyCodes,
  IWechatLoginReq,
  IWechatLoginResp,
  IUseItemReq,
  IUseItemResp,
  IBuyItemReq,
  IBuyItemResp,
  // ...
} from './protocol';

export class GameAPI {
  private net = NetworkManager.getInstance();

  // 登录
  wechatLogin(code: string) {
    return this.net.request<IWechatLoginReq, IWechatLoginResp>(
      AuthCodes.WECHAT_LOGIN_REQ,
      { code }
    );
  }

  // 使用物品
  useItem(itemId: string, quantity = 1) {
    return this.net.request<IUseItemReq, IUseItemResp>(
      PlayerCodes.USE_ITEM_REQ,
      { itemId, quantity }
    );
  }

  // 购买物品
  buyItem(tradeId: string) {
    return this.net.request<IBuyItemReq, IBuyItemResp>(
      EconomyCodes.BUY_ITEM_REQ,
      { tradeId }
    );
  }
}

export const gameAPI = new GameAPI();
```

### 3. UI 组件中使用

```typescript
// assets/scripts/ui/ShopUI.ts

import { _decorator, Component, Label } from 'cc';
import { gameAPI } from '../network/GameAPI';
import { ServerPushCodes, IBuyItemResp } from '../network/protocol';

const { ccclass, property } = _decorator;

@ccclass('ShopUI')
export class ShopUI extends Component {
  @property(Label)
  goldLabel: Label | null = null;

  onLoad() {
    // 监听货币变更
    cc.director.on(ServerPushCodes.CURRENCY_CHANGED, this.onCurrencyChanged, this);
  }

  onDestroy() {
    cc.director.off(ServerPushCodes.CURRENCY_CHANGED, this.onCurrencyChanged, this);
  }

  /** 购买 */
  async onBuyClick(tradeId: string) {
    try {
      const result: IBuyItemResp = await gameAPI.buyItem(tradeId);
      console.log('购买成功:', result);
    } catch (error) {
      console.error('购买失败:', error);
    }
  }

  /** 货币变更回调 */
  onCurrencyChanged(data: { currencyType: string; newValue: number }) {
    if (data.currencyType === 'spiritStones') {
      this.goldLabel!.string = data.newValue.toString();
    }
  }
}
```

---

## 类型提示

所有协议类型都有完整的 TypeScript 定义，IDE 会提供代码提示：

```typescript
import { IUseItemReq } from './protocol';

const req: IUseItemReq = {
  itemId: 'xxx',
  quantity: 5,
  // targetId 是可选的，IDE 会提示
};
```

---

## 常见问题

### Q: 如何添加新的消息号？

A: 在服务器 `shared/protocol/message-codes.ts` 中添加，然后同步到客户端。

### Q: 修改类型定义后如何同步？

A: 重新运行同步脚本或更新子模块：

```bash
# 方式1: 同步脚本
node tools/sync-protocol.js D:/CocosProjects/TaiXuClient

# 方式2: Git Submodule
git submodule update --remote
```

### Q: Cocos 编译报错找不到模块？

A: 确保 `tsconfig.json` 包含了协议目录：

```json
{
  "include": ["assets/**/*", "assets/scripts/network/protocol/**/*"]
}
```

---

## 最佳实践

1. **统一修改**: 协议修改必须在服务器进行，然后同步到客户端
2. **版本管理**: 协议变更需要通知客户端开发人员
3. **向后兼容**: 新增消息号，不要修改已有的消息号
4. **类型安全**: 始终使用接口类型，避免使用 `any`
