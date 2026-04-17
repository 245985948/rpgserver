/**
 * 全局拦截器
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

// 导出 Protobuf 拦截器
export {
  ProtobufInterceptor,
  WebSocketProtobufHandler,
} from './protobuf.interceptor';

/**
 * 响应格式统一拦截器
 * 将所有响应包装为标准格式
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const timestamp = Date.now();

    return next.handle().pipe(
      map((data) => ({
        code: 200,
        message: 'success',
        data,
        timestamp,
      })),
    );
  }
}

/**
 * 日志拦截器
 * 记录请求处理时间和响应信息
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;
        const delay = Date.now() - now;

        this.logger.log(`${method} ${url} ${statusCode} +${delay}ms`);
      }),
    );
  }
}

/**
 * 缓存拦截器
 * 为特定请求提供缓存支持
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly cache = new Map<string, { data: unknown; expiry: number }>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = `${request.method}:${request.url}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return new Observable((observer) => {
        observer.next(cached.data);
        observer.complete();
      });
    }

    return next.handle().pipe(
      tap((data) => {
        // 默认缓存5分钟
        this.cache.set(cacheKey, {
          data,
          expiry: Date.now() + 5 * 60 * 1000,
        });
      }),
    );
  }
}
