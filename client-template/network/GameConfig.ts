/**
 * 游戏配置
 * 客户端和服务器共用
 */

export const GameConfig = {
  // WebSocket 服务器地址
  WS_SERVER_URL: 'ws://localhost:3000/game',

  // 是否使用 Protobuf
  USE_PROTOBUF: true,

  // 心跳间隔 (毫秒)
  HEARTBEAT_INTERVAL: 30000,

  // 请求超时时间 (毫秒)
  REQUEST_TIMEOUT: 10000,

  // 重连配置
  RECONNECT: {
    maxAttempts: 5,
    delay: 3000,
    backoffMultiplier: 1.5,
  },
};
