/**
 * 客户端消息协议使用示例 (JavaScript/微信小游戏)
 * 演示如何与消息号系统配合使用
 */

// ============================================
// 1. 消息号常量 (从服务器同步)
// ============================================

const MessageCodes = {
  // 系统
  HEARTBEAT_REQ: 0,
  HEARTBEAT_RESP: 1,

  // 认证
  WECHAT_LOGIN_REQ: 1000,
  WECHAT_LOGIN_RESP: 1001,
  REFRESH_TOKEN_REQ: 1002,
  REFRESH_TOKEN_RESP: 1003,

  // 玩家
  GET_PLAYER_DATA_REQ: 2000,
  GET_PLAYER_DATA_RESP: 2001,
  USE_ITEM_REQ: 2004,
  USE_ITEM_RESP: 2005,

  // 推送
  PLAYER_ATTR_CHANGED: 900000,
  CURRENCY_CHANGED: 900001,
};

// ============================================
// 2. 网络管理器
// ============================================

class GameNetwork {
  constructor() {
    this.socket = null;
    this.seq = 0;
    this.pendingRequests = new Map(); // 等待响应的请求
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.heartbeatInterval = null;
  }

  // 连接到服务器
  connect(url, token) {
    return new Promise((resolve, reject) => {
      // WebSocket 连接，携带 JWT token
      this.socket = wx.connectSocket({
        url: `${url}?token=${token}`,
      });

      this.socket.onOpen(() => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        resolve();
      });

      this.socket.onMessage((res) => {
        this.handleMessage(res.data);
      });

      this.socket.onClose(() => {
        console.log('WebSocket closed');
        this.stopHeartbeat();
        this.attemptReconnect(url, token);
      });

      this.socket.onError((err) => {
        console.error('WebSocket error:', err);
        reject(err);
      });
    });
  }

  // 发送请求并等待响应
  request(code, payload, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const seq = ++this.seq;

      // 存储 pending 请求
      this.pendingRequests.set(seq, {
        resolve,
        reject,
        timeout: setTimeout(() => {
          this.pendingRequests.delete(seq);
          reject(new Error(`Request timeout: code=${code}, seq=${seq}`));
        }, timeout),
      });

      // 发送消息
      const message = {
        code,
        seq,
        payload,
        timestamp: Date.now(),
      };

      this.send(message);
    });
  }

  // 发送消息 (不等待响应)
  send(message) {
    if (this.socket && this.socket.readyState === 1) {
      this.socket.send({
        data: JSON.stringify(message),
      });
      console.log(`[SEND] code=${message.code}, seq=${message.seq}`);
    } else {
      console.error('WebSocket not connected');
    }
  }

  // 处理收到的消息
  handleMessage(data) {
    let message;
    try {
      message = JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse message:', data);
      return;
    }

    const { code, seq, payload, error } = message;
    console.log(`[RECV] code=${code}, seq=${seq}`);

    // 处理响应
    if (seq > 0 && this.pendingRequests.has(seq)) {
      const pending = this.pendingRequests.get(seq);
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(seq);

      if (error) {
        pending.reject(error);
      } else {
        pending.resolve(payload);
      }
      return;
    }

    // 处理推送
    this.handlePush(code, payload);
  }

  // 处理服务器推送
  handlePush(code, payload) {
    switch (code) {
      case MessageCodes.PLAYER_ATTR_CHANGED:
        console.log('Player attr changed:', payload);
        // 更新UI
        updatePlayerAttributes(payload.changes);
        break;

      case MessageCodes.CURRENCY_CHANGED:
        console.log('Currency changed:', payload);
        // 更新货币显示
        updateCurrencyDisplay(payload.currencyType, payload.newValue);
        break;

      default:
        console.log('Unknown push message:', code, payload);
    }
  }

  // 心跳
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.request(MessageCodes.HEARTBEAT_REQ, {})
        .then((resp) => {
          // 计算延迟
          const delay = Date.now() - resp.serverTime;
          console.log(`Heartbeat delay: ${delay}ms`);
        })
        .catch((err) => {
          console.error('Heartbeat failed:', err);
        });
    }, 30000); // 30秒
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 重连
  attemptReconnect(url, token) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect(url, token).catch((err) => {
        console.error('Reconnect failed:', err);
      });
    }, delay);
  }
}

// ============================================
// 3. API 封装
// ============================================

class GameAPI {
  constructor(network) {
    this.network = network;
  }

  // 微信登录
  async wechatLogin(wxCode) {
    return this.network.request(MessageCodes.WECHAT_LOGIN_REQ, {
      code: wxCode,
    });
  }

  // 获取玩家数据
  async getPlayerData() {
    return this.network.request(MessageCodes.GET_PLAYER_DATA_REQ, {});
  }

  // 使用物品
  async useItem(itemId, quantity = 1) {
    return this.network.request(MessageCodes.USE_ITEM_REQ, {
      itemId,
      quantity,
    });
  }
}

// ============================================
// 4. 使用示例
// ============================================

async function main() {
  const network = new GameNetwork();
  const api = new GameAPI(network);

  try {
    // 1. 连接到服务器
    await network.connect('wss://game.example.com/game', 'jwt_token_here');

    // 2. 获取玩家数据
    const playerData = await api.getPlayerData();
    console.log('Player data:', playerData);

    // 3. 使用物品
    const result = await api.useItem('potion_001', 3);
    console.log('Use item result:', result);

    // 4. 如果服务器推送属性变更，会自动更新
  } catch (error) {
    console.error('Error:', error);
  }
}

// ============================================
// 辅助函数
// ============================================

function updatePlayerAttributes(changes) {
  // 更新玩家属性UI
  for (const change of changes) {
    console.log(`${change.field}: ${change.oldValue} -> ${change.newValue}`);
  }
}

function updateCurrencyDisplay(type, value) {
  // 更新货币显示
  console.log(`Currency ${type}: ${value}`);
}

// 运行
main();
