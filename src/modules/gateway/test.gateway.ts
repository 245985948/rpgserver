/**
 * 测试 WebSocket 网关
 * 提供最简单的 WebSocket 连接测试
 * 无需认证，用于排查连接问题
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: 'test',
  cors: {
    origin: '*',
    credentials: false,
  },
  transports: ['websocket', 'polling'], // 允许降级到轮询
})
export class TestGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TestGateway.name);
  private clientCount = 0;

  afterInit(server: Server) {
    this.logger.log('Test WebSocket Gateway initialized on namespace: /test');
  }

  handleConnection(client: Socket) {
    this.clientCount++;
    const transport = client.conn?.transport?.name || 'unknown';

    this.logger.log(
      `[CONNECT] /test | clientId=${client.id} | transport=${transport} | totalClients=${this.clientCount}`,
    );

    // 发送欢迎消息
    client.emit('welcome', {
      message: 'Connected to test server',
      clientId: client.id,
      timestamp: Date.now(),
    });
  }

  handleDisconnect(client: Socket) {
    this.clientCount--;
    const transport = client.conn?.transport?.name || 'unknown';

    this.logger.log(
      `[DISCONNECT] /test | clientId=${client.id} | transport=${transport} | totalClients=${this.clientCount}`,
    );
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log(`[RECV] client=${client.id} | event=ping | data=${JSON.stringify(data)}`);

    const response = {
      event: 'pong',
      data: {
        message: 'pong',
        received: data,
        timestamp: Date.now(),
        clientId: client.id,
      },
    };

    this.logger.log(`[SEND] client=${client.id} | event=pong`);
    return response;
  }

  @SubscribeMessage('echo')
  handleEcho(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log(`[RECV] client=${client.id} | event=echo | data=${JSON.stringify(data)}`);

    const response = {
      message: 'Echo response',
      received: data,
      timestamp: Date.now(),
    };

    client.emit('echo', response);
    this.logger.log(`[SEND] client=${client.id} | event=echo | data=${JSON.stringify(response)}`);

    return { success: true };
  }

  @SubscribeMessage('broadcast')
  handleBroadcast(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log(`[RECV] client=${client.id} | event=broadcast | data=${JSON.stringify(data)}`);

    // 广播给所有客户端
    const broadcastMsg = {
      from: client.id,
      message: data,
      timestamp: Date.now(),
    };

    this.server.emit('broadcast', broadcastMsg);
    this.logger.log(`[BROADCAST] clients=${this.clientCount} | data=${JSON.stringify(broadcastMsg)}`);

    return { success: true, broadcasted: this.clientCount };
  }
}
