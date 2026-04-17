/**
 * 网络管理器
 * 处理 WebSocket 连接、消息收发、心跳等
 * 支持 Protobuf 和 JSON 双协议
 */

import { GameConfig } from './GameConfig';
import { getMessageName, ErrorCodes } from './MessageCodes';

// protobuf.js 类型定义
declare const protobuf: any;

/** 消息回调函数类型 */
type MessageCallback = (payload: any) => void;

/** 请求等待项 */
interface IPendingRequest {
  seq: number;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout: number;
}

/** 网络状态 */
export enum NetworkState {
  DISCONNECTED = 0,
  CONNECTING = 1,
  CONNECTED = 2,
  RECONNECTING = 3,
}

export class NetworkManager {
  private static instance: NetworkManager;
  public static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  /** WebSocket 实例 */
  private socket: WebSocket | null = null;

  /** 当前状态 */
  private state: NetworkState = NetworkState.DISCONNECTED;

  /** protobuf 根对象 */
  private protobufRoot: any = null;

  /** WebSocketMessage 类型 */
  private wsMessageType: any = null;

  /** 序列号 */
  private seq = 0;

  /** 等待的请求 */
  private pendingRequests = new Map<number, IPendingRequest>();

  /** 消息监听器 (用于推送消息) */
  private messageListeners = new Map<number, MessageCallback[]>();

  /** 通用推送监听器 */
  private pushListeners = new Map<string, MessageCallback[]>();

  /** 心跳定时器 */
  private heartbeatTimer: number = 0;

  /** 重连尝试次数 */
  private reconnectAttempts = 0;

  /** 重连定时器 */
  private reconnectTimer: number = 0;

  /** 连接成功回调 */
  private onConnectCallback: (() => void) | null = null;

  /** 连接断开回调 */
  private onDisconnectCallback: (() => void) | null = null;

  /** 错误回调 */
  private onErrorCallback: ((error: any) => void) | null = null;

  /** 私有构造函数 */
  private constructor() {}

  /**
   * 初始化 protobuf
   * 在 connect 之前调用
   */
  public async initProtobuf(protoUrl: string): Promise<boolean> {
    if (!GameConfig.USE_PROTOBUF) {
      console.log('[Network] Protobuf disabled, using JSON');
      return true;
    }

    return new Promise((resolve) => {
      // 检查 protobuf.js 是否已加载
      if (typeof protobuf === 'undefined') {
        console.warn('[Network] protobuf.js not loaded, will use JSON fallback');
        resolve(false);
        return;
      }

      protobuf.load(protoUrl, (err: any, root: any) => {
        if (err) {
          console.error('[Network] Failed to load protobuf:', err);
          resolve(false);
          return;
        }

        this.protobufRoot = root;
        this.wsMessageType = root.lookupType('taixu.WebSocketMessage');
        console.log('[Network] Protobuf loaded successfully');
        resolve(true);
      });
    });
  }

  /**
   * 连接服务器
   */
  public connect(url?: string, token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state === NetworkState.CONNECTED) {
        resolve();
        return;
      }

      if (this.state === NetworkState.CONNECTING) {
        reject(new Error('Already connecting'));
        return;
      }

      this.state = NetworkState.CONNECTING;

      const wsUrl = url || GameConfig.WS_SERVER_URL;
      const fullUrl = token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl;

      console.log(`[Network] Connecting to ${wsUrl}...`);

      try {
        this.socket = new WebSocket(fullUrl);

        this.socket.onopen = () => {
          console.log('[Network] WebSocket connected');
          this.state = NetworkState.CONNECTED;
          this.reconnectAttempts = 0;
          this.startHeartbeat();

          if (this.onConnectCallback) {
            this.onConnectCallback();
          }
          resolve();
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.socket.onclose = () => {
          console.log('[Network] WebSocket disconnected');
          this.handleDisconnect();
        };

        this.socket.onerror = (error) => {
          console.error('[Network] WebSocket error:', error);
          this.state = NetworkState.DISCONNECTED;

          if (this.onErrorCallback) {
            this.onErrorCallback(error);
          }
          reject(error);
        };
      } catch (error) {
        this.state = NetworkState.DISCONNECTED;
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    this.stopHeartbeat();
    this.stopReconnect();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.state = NetworkState.DISCONNECTED;
    this.clearPendingRequests();
  }

  /**
   * 发送请求并等待响应
   * @param code 消息号
   * @param payload 消息体
   * @returns Promise<响应数据>
   */
  public async request(code: number, payload: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.state !== NetworkState.CONNECTED) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const seq = ++this.seq;

      // 设置超时
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(seq);
        reject(new Error(`Request timeout: ${getMessageName(code)}`));
      }, GameConfig.REQUEST_TIMEOUT);

      // 保存等待的请求
      this.pendingRequests.set(seq, {
        seq,
        resolve,
        reject,
        timeout,
      });

      // 发送消息
      this.send(code, seq, payload);
    });
  }

  /**
   * 发送通知（不等待响应）
   */
  public notify(code: number, payload: any = {}): void {
    if (this.state !== NetworkState.CONNECTED) {
      console.warn('[Network] Cannot send, not connected');
      return;
    }

    const seq = ++this.seq;
    this.send(code, seq, payload);
  }

  /**
   * 注册消息监听器（用于推送消息）
   * @param code 推送消息号
   * @param callback 回调函数
   */
  public on(code: number, callback: MessageCallback): void {
    if (!this.messageListeners.has(code)) {
      this.messageListeners.set(code, []);
    }
    this.messageListeners.get(code)!.push(callback);
  }

  /**
   * 移除消息监听器
   */
  public off(code: number, callback: MessageCallback): void {
    const listeners = this.messageListeners.get(code);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 注册通用推送监听器
   * @param event 事件名 (push, broadcast)
   * @param callback 回调函数
   */
  public onPush(event: string, callback: MessageCallback): void {
    if (!this.pushListeners.has(event)) {
      this.pushListeners.set(event, []);
    }
    this.pushListeners.get(event)!.push(callback);
  }

  /**
   * 移除通用推送监听器
   */
  public offPush(event: string, callback: MessageCallback): void {
    const listeners = this.pushListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 设置连接成功回调
   */
  public setOnConnect(callback: () => void): void {
    this.onConnectCallback = callback;
  }

  /**
   * 设置连接断开回调
   */
  public setOnDisconnect(callback: () => void): void {
    this.onDisconnectCallback = callback;
  }

  /**
   * 设置错误回调
   */
  public setOnError(callback: (error: any) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * 获取当前状态
   */
  public getState(): NetworkState {
    return this.state;
  }

  /**
   * 是否已连接
   */
  public isConnected(): boolean {
    return this.state === NetworkState.CONNECTED;
  }

  /**
   * 发送消息（内部方法）
   */
  private send(code: number, seq: number, payload: any): void {
    const message = {
      code,
      seq,
      payload,
      timestamp: Date.now(),
    };

    console.log(`[Network] SEND code=${getMessageName(code)} seq=${seq}`, payload);

    // 尝试使用 protobuf
    if (GameConfig.USE_PROTOBUF && this.wsMessageType) {
      const wsMessage = {
        event: 'message',
        payload: new TextEncoder().encode(JSON.stringify(message)),
        timestamp: Date.now(),
        seq: 0,
      };

      const errMsg = this.wsMessageType.verify(wsMessage);
      if (errMsg) {
        console.warn('[Network] Protobuf verify failed:', errMsg);
      } else {
        const buffer = this.wsMessageType.encode(this.wsMessageType.create(wsMessage)).finish();
        this.socket!.send(buffer);
        return;
      }
    }

    // 降级到 JSON
    this.socket!.send(JSON.stringify(message));
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(data: any): void {
    let message: any;
    let isProtobuf = false;

    // 尝试解析 protobuf
    if (data instanceof ArrayBuffer || data instanceof Blob) {
      let buffer: Uint8Array;

      if (data instanceof Blob) {
        // Blob 需要异步读取，这里简化处理
        console.warn('[Network] Blob data received, not supported yet');
        return;
      } else {
        buffer = new Uint8Array(data);
      }

      if (this.wsMessageType) {
        try {
          const wsMessage = this.wsMessageType.decode(buffer);
          const payloadStr = new TextDecoder().decode(wsMessage.payload);
          message = JSON.parse(payloadStr);
          isProtobuf = true;
        } catch (e) {
          console.warn('[Network] Failed to decode protobuf:', e);
        }
      }
    }

    // 尝试解析 JSON
    if (!message && typeof data === 'string') {
      try {
        message = JSON.parse(data);
      } catch (e) {
        console.error('[Network] Failed to parse message:', data);
        return;
      }
    }

    if (!message) {
      console.error('[Network] Unknown message format:', data);
      return;
    }

    console.log(
      `[Network] RECV code=${getMessageName(message.code)} seq=${message.seq} format=${isProtobuf ? 'protobuf' : 'json'}`,
      message.payload
    );

    // 处理响应
    if (this.pendingRequests.has(message.seq)) {
      const request = this.pendingRequests.get(message.seq)!;
      this.pendingRequests.delete(message.seq);
      clearTimeout(request.timeout);

      if (message.error) {
        request.reject(message.error);
      } else {
        request.resolve(message.payload);
      }
      return;
    }

    // 处理推送消息
    if (message.code >= 8000) {
      const listeners = this.messageListeners.get(message.code);
      if (listeners) {
        listeners.forEach((callback) => {
          try {
            callback(message.payload);
          } catch (e) {
            console.error('[Network] Message listener error:', e);
          }
        });
      }
    }

    // 触发通用推送监听器
    const pushListeners = this.pushListeners.get('message');
    if (pushListeners) {
      pushListeners.forEach((callback) => {
        try {
          callback(message);
        } catch (e) {
          console.error('[Network] Push listener error:', e);
        }
      });
    }
  }

  /**
   * 处理断开连接
   */
  private handleDisconnect(): void {
    this.state = NetworkState.DISCONNECTED;
    this.stopHeartbeat();
    this.clearPendingRequests();

    if (this.onDisconnectCallback) {
      this.onDisconnectCallback();
    }

    // 自动重连
    this.attemptReconnect();
  }

  /**
   * 开始心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = window.setInterval(() => {
      if (this.state === NetworkState.CONNECTED) {
        // 发送心跳
        this.notify(1001, {}); // HEARTBEAT_REQ
      }
    }, GameConfig.HEARTBEAT_INTERVAL);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = 0;
    }
  }

  /**
   * 尝试重连
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= GameConfig.RECONNECT.maxAttempts) {
      console.error('[Network] Max reconnect attempts reached');
      return;
    }

    this.state = NetworkState.RECONNECTING;
    this.reconnectAttempts++;

    const delay = GameConfig.RECONNECT.delay * Math.pow(
      GameConfig.RECONNECT.backoffMultiplier,
      this.reconnectAttempts - 1
    );

    console.log(`[Network] Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch((err) => {
        console.error('[Network] Reconnect failed:', err);
      });
    }, delay);
  }

  /**
   * 停止重连
   */
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = 0;
    }
    this.reconnectAttempts = 0;
  }

  /**
   * 清空等待的请求
   */
  private clearPendingRequests(): void {
    this.pendingRequests.forEach((request) => {
      clearTimeout(request.timeout);
      request.reject(new Error('Connection closed'));
    });
    this.pendingRequests.clear();
  }
}

// 导出单例
export const network = NetworkManager.getInstance();
