/**
 * Protobuf 序列化拦截器
 * 自动将响应数据序列化为 Protobuf 格式
 * 客户端通过 Accept: application/x-protobuf 请求头启用
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { ProtobufService } from '../../shared/protobuf/protobuf.service';

export interface IResponseWrapper<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
  route?: string;
}

@Injectable()
export class ProtobufInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ProtobufInterceptor.name);

  constructor(private readonly protobufService: ProtobufService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse<Response>();

    // 检查客户端是否支持 Protobuf
    const acceptHeader = request.headers['accept'] || '';
    const useProtobuf = acceptHeader.includes('application/x-protobuf');

    // 获取路由信息，用于选择对应的 Protobuf 消息类型
    const route = request.route?.path || request.url;

    return next.handle().pipe(
      map((result: IResponseWrapper<unknown>) => {
        // 如果客户端不支持 Protobuf 或数据已经是 Buffer，直接返回
        if (!useProtobuf || result instanceof Buffer) {
          return result;
        }

        // 尝试使用 Protobuf 序列化
        const pbBuffer = this.serializeToProtobuf(result, route);

        if (pbBuffer) {
          // 设置响应头
          response.setHeader('Content-Type', 'application/x-protobuf');
          response.setHeader('X-Content-Encoding', 'protobuf');

          // 添加原始大小信息 (用于调试)
          const jsonSize = Buffer.byteLength(JSON.stringify(result));
          response.setHeader('X-Original-Size', jsonSize.toString());
          response.setHeader('X-Protobuf-Size', pbBuffer.length.toString());

          return pbBuffer;
        }

        // Protobuf 失败，返回原始 JSON
        return result;
      }),
    );
  }

  /**
   * 根据路由选择合适的 Protobuf 消息类型并序列化
   */
  private serializeToProtobuf(data: IResponseWrapper<unknown>, route: string): Buffer | null {
    // 使用通用的 GameResponse 包装
    const messageName = 'taixu.GameResponse';

    try {
      // 将 data 字段序列化为 JSON 字符串然后转为 bytes
      // 实际项目中应该为每个路由定义具体的响应类型
      const payload = {
        seq: 0,
        route: data.route || route,
        success: data.code === 200,
        payload: Buffer.from(JSON.stringify(data.data)),
        error: data.code !== 200 ? {
          code: data.code,
          message: data.message,
          detail: '',
        } : undefined,
        timestamp: data.timestamp || Date.now(),
        processing_time: 0,
      };

      return this.protobufService.encode(messageName, payload);
    } catch (error) {
      this.logger.warn(`Failed to serialize to Protobuf for route ${route}:`, error);
      return null;
    }
  }
}

/**
 * WebSocket Protobuf 处理器
 * 处理 WebSocket 消息的 Protobuf 序列化/反序列化
 */
@Injectable()
export class WebSocketProtobufHandler {
  private readonly logger = new Logger(WebSocketProtobufHandler.name);

  constructor(private readonly protobufService: ProtobufService) {}

  /**
   * 解析传入的 WebSocket 消息
   * 支持 Protobuf 和 JSON 两种格式
   */
  parseMessage(data: Buffer | string | ArrayBuffer): { event: string; payload: unknown } | null {
    let buffer: Buffer;

    if (typeof data === 'string') {
      // JSON 格式
      try {
        return JSON.parse(data);
      } catch (error) {
        this.logger.warn('Failed to parse JSON message:', error);
        return null;
      }
    }

    if (data instanceof ArrayBuffer) {
      buffer = Buffer.from(data);
    } else {
      buffer = data;
    }

    // 尝试 Protobuf 解码
    const message = this.protobufService.decode<{ event: string; payload: Buffer }>(
      'taixu.WebSocketMessage',
      buffer,
    );

    if (message) {
      try {
        return {
          event: message.event,
          payload: JSON.parse(message.payload.toString()),
        };
      } catch {
        return {
          event: message.event,
          payload: message.payload,
        };
      }
    }

    // 尝试 JSON 解码 (可能客户端发送了 JSON)
    try {
      return JSON.parse(buffer.toString());
    } catch {
      this.logger.warn('Failed to parse message');
      return null;
    }
  }

  /**
   * 序列化 outgoing WebSocket 消息
   */
  serializeMessage(event: string, payload: unknown, useProtobuf = true): Buffer | string {
    if (!useProtobuf) {
      return JSON.stringify({ event, payload, timestamp: Date.now() });
    }

    const message = {
      event,
      payload: Buffer.from(JSON.stringify(payload)),
      timestamp: Date.now(),
      seq: 0,
    };

    const buffer = this.protobufService.encode('taixu.WebSocketMessage', message);

    if (buffer) {
      return buffer;
    }

    // 降级到 JSON
    return JSON.stringify({ event, payload, timestamp: Date.now() });
  }
}
