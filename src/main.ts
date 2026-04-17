/**
 * 应用入口
 * 启动NestJS服务器
 */

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

import { AppModule } from './app.module';
import {
  HttpExceptionFilter,
  AllExceptionsFilter,
} from './common/filters';
import {
  TransformInterceptor,
  LoggingInterceptor,
} from './common/interceptors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // 启用 HTTP Keep-Alive
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;

  // 配置 WebSocket 适配器 (Socket.IO)
  app.useWebSocketAdapter(new IoAdapter(app));

  // 获取底层 HTTP 服务器并配置 Keep-Alive
  const server = app.getHttpServer();
  server.keepAliveTimeout = 65000; // 65秒，比负载均衡器的超时时间稍长
  server.headersTimeout = 66000;   // 66秒

  // 全局管道 - 参数验证
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 全局拦截器
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new LoggingInterceptor(),
  );

  // 全局过滤器
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new HttpExceptionFilter(),
  );

  // 启用CORS
  app.enableCors({
    origin: true,
    credentials: true,
    // 允许 Authorization Header 用于 JWT
    allowedHeaders: ['Content-Type', 'Authorization', 'x-client-version'],
  });

  // 设置全局前缀
  app.setGlobalPrefix('api');

  await app.listen(port);

  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║     太墟修仙录服务端 (TaiXu Server)                        ║
║                                                            ║
║     环境: ${String(configService.get('nodeEnv')).padEnd(43)}║
║     版本: ${String(configService.get('version')).padEnd(43)}║
║     端口: ${String(port).padEnd(43)}║
║                                                            ║
║     HTTP:      http://localhost:${String(port + '/api').padEnd(22)}║
║     Health:    http://localhost:${String(port + '/api/health').padEnd(22)}║
║     WebSocket: ws://localhost:${String(port + '/game').padEnd(25)}║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
