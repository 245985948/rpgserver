/**
 * 网络管理器 - Socket.IO 版本
 * 兼容 Socket.IO 服务端
 */

import { GameConfig } from './GameConfig';
import { getMessageName, ErrorCodes } from './MessageCodes';
import { io, Socket } from 'socket.io-client';

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

  /** Socket.IO 实例 */
  private socket: Socket | null = null;

  /** 当前状态 */
  private state: NetworkState = NetworkState.DISCONNECTED;

  /** 序列号 */
  private seq = 0;

  /** 等待的请求 */
  private pendingRequests = new Map<number, IPendingRequest>();

  /** 消息监听器 (用于推送消息) */
  private messageListeners = new Map<number, MessageCallback[]>();

  /** 连接成功回调 */
  private onConnectCallback: (() => void) | null = null;

  /** 连接断开回调 */
  private onDisconnectCallback: (() => void) | null = null;

  /** 错误回调 */
  private onErrorCallback: ((error: any) => void) | null = null;

  /** 私有构造函数 */
  private constructor() {}

  /**
   * 初始化 (protobuf 不再需要)
   */
  public async initProtobuf(protoUrl: string): Promise<boolean> {
    // Socket.IO 使用 JSON，不需要 protobuf
    return true;
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
      // 提取命名空间
      const urlObj = new URL(wsUrl);
      const namespace = urlObj.pathname || '/game';
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

      console.log(`[Network] Connecting to ${baseUrl}${namespace}...`);

      try {
        this.socket = io(baseUrl, {
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          query: token ? { token } : {},
          reconnection: false, // 我们自己处理重连
          timeout: 10000,
        });

        this.socket.on('connect', () => {
          console.log('[Network] Socket.IO connected, id:', this.socket?.id);
          this.state = NetworkState.CONNECTED;

          // 设置消息监听
          this.socket?.on('message', (data) => {
            this.handleMessage(data);
          });

          if (this.onConnectCallback) {
            this.onConnectCallback();
          }
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('[Network] Socket.IO disconnected:', reason);
          this.handleDisconnect();
        });

        this.socket.on('connect_error', (error) => {
          console.error('[Network] Socket.IO connection error:', error);
          this.state = NetworkState.DISCONNECTED;
          if (this.onErrorCallback) {
            this.onErrorCallback(error);
          }
          reject(error);
        });

        // 连接确认
        this.socket.on('connected', (data) => {
          console.log('[Network] Server confirmed connection:', data);
        });

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
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.state = NetworkState.DISCONNECTED;
    this.clearPendingRequests();
  }

  /**
   * 发送请求并等待响应
   */
  public async request(code: number, payload: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.state !== NetworkState.CONNECTED || !this.socket) {
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
    if (this.state !== NetworkState.CONNECTED || !this.socket) {
      console.warn('[Network] Cannot send, not connected');
      return;
    }

    const seq = ++this.seq;
    this.send(code, seq, payload);
  }

  /**
   * 注册消息监听器（用于推送消息）
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
    this.socket?.emit('message', message);
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(data: any): void {
    console.log(
      `[Network] RECV code=${getMessageName(data.code)} seq=${data.seq}`,
      data.payload
    );

    // 处理响应
    if (this.pendingRequests.has(data.seq)) {
      const request = this.pendingRequests.get(data.seq)!;
      this.pendingRequests.delete(data.seq);
      clearTimeout(request.timeout);

      if (data.error) {
        request.reject(data.error);
      } else {
        request.resolve(data.payload);
      }
      return;
    }

    // 处理推送消息 (code >= 900000)
    if (data.code >= 900000) {
      const listeners = this.messageListeners.get(data.code);
      if (listeners) {
        listeners.forEach((callback) => {
          try {
            callback(data.payload);
          } catch (e) {
            console.error('[Network] Message listener error:', e);
          }
        });
      }
    }
  }

  /**
   * 处理断开连接
   */
  private handleDisconnect(): void {
    this.state = NetworkState.DISCONNECTED;
    this.clearPendingRequests();

    if (this.onDisconnectCallback) {
      this.onDisconnectCallback();
    }
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
