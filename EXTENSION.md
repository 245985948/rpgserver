# 扩展指南

本文档介绍如何在此框架基础上添加新功能。

## 目录

1. [添加新模块](#添加新模块)
2. [添加新配置表](#添加新配置表)
3. [添加新事件](#添加新事件)
4. [添加新WebSocket](#添加新websocket)
5. [添加新数据库模型](#添加新数据库模型)

---

## 添加新模块

参考 `src/modules/example/` 文件夹中的完整示例。

### 步骤

1. **创建模块文件夹**

```bash
mkdir src/modules/new-feature
```

2. **创建 Module 文件**

```typescript
// src/modules/new-feature/new-feature.module.ts
import { Module } from '@nestjs/common';
import { NewFeatureController } from './new-feature.controller';
import { NewFeatureService } from './new-feature.service';

@Module({
  controllers: [NewFeatureController],
  providers: [NewFeatureService],
  exports: [NewFeatureService],
})
export class NewFeatureModule {}
```

3. **创建 Controller**

```typescript
// src/modules/new-feature/new-feature.controller.ts
import { Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { NewFeatureService } from './new-feature.service';
import { AuthGuard } from '../../common/guards';

@Controller('new-feature')
@UseGuards(AuthGuard)
export class NewFeatureController {
  constructor(private readonly service: NewFeatureService) {}

  @Get()
  async get(@Req() req: any) {
    return this.service.get(req.playerId);
  }
}
```

4. **创建 Service**

```typescript
// src/modules/new-feature/new-feature.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventManager } from '../../core/event.manager';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class NewFeatureService {
  private readonly logger = new Logger(NewFeatureService.name);

  constructor(
    private eventManager: EventManager,
    private redisService: RedisService,
  ) {}

  async get(playerId: string): Promise<any> {
    this.logger.debug(`Getting data for ${playerId}`);
    return { playerId };
  }
}
```

5. **导出模块**

```typescript
// src/modules/new-feature/index.ts
export * from './new-feature.module';
export * from './new-feature.service';
```

6. **注册到主模块**

```typescript
// src/app.module.ts
import { NewFeatureModule } from './modules';

@Module({
  imports: [
    // ...其他模块
    NewFeatureModule,
  ],
})
```

---

## 添加新配置表

### 步骤

1. **加载配置表**

```typescript
// src/core/config.manager.ts
async loadAllConfigs(): Promise<void> {
  // 添加新配置表
  this.configCache.set('new_config', await this.loadNewConfig());
}

private async loadNewConfig(): Promise<ConfigData> {
  // 从JSON文件、数据库或配置中心加载
  return {
    'item_001': { name: '测试物品', value: 100 },
  };
}
```

2. **使用配置**

```typescript
// 在Service中注入使用
constructor(private configManager: ConfigManager) {}

someMethod() {
  const config = this.configManager.get('new_config', 'item_001');
  return config;
}
```

---

## 添加新事件

### 步骤

1. **定义事件常量**

```typescript
// src/shared/constants/index.ts
export const EVENTS = {
  // ...现有事件
  NEW_FEATURE_EVENT: 'new_feature:event',
};
```

2. **发布事件**

```typescript
// 在业务代码中发布
this.eventManager.emit(EVENTS.NEW_FEATURE_EVENT, { data }, playerId);
```

3. **订阅事件**

```typescript
// 在Service中订阅
constructor(private eventManager: EventManager) {
  this.eventManager.on(EVENTS.NEW_FEATURE_EVENT).subscribe((event) => {
    this.handleEvent(event);
  });
}
```

---

## 添加新WebSocket

### 步骤

1. **创建 Gateway**

```typescript
// src/modules/new-feature/new-feature.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: 'new-feature',
  cors: { origin: '*' },
})
export class NewFeatureGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join')
  async handleJoin(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(`room:${data.roomId}`);
    return { status: 'success' };
  }

  broadcast(roomId: string, data: any) {
    this.server.to(`room:${roomId}`).emit('update', data);
  }
}
```

2. **注册到模块**

```typescript
// src/modules/new-feature/new-feature.module.ts
@Module({
  providers: [NewFeatureService, NewFeatureGateway],
})
```

---

## 添加新数据库模型

### 步骤

1. **创建 Schema**

```typescript
// src/database/schemas/new-entity.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NewEntityDocument = NewEntity & Document;

@Schema({
  timestamps: true,
  collection: 'new_entities',
})
export class NewEntity {
  @Prop({ type: Types.ObjectId, ref: 'Player', required: true, index: true })
  playerId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, default: 0 })
  value: number;
}

export const NewEntitySchema = SchemaFactory.createForClass(NewEntity);
NewEntitySchema.index({ playerId: 1, createdAt: -1 });
```

2. **导出 Schema**

```typescript
// src/database/schemas/index.ts
export * from './new-entity.schema';
```

3. **注册到数据库模块**

```typescript
// src/database/database.module.ts
import { NewEntity, NewEntitySchema } from './schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NewEntity.name, schema: NewEntitySchema },
    ]),
  ],
})
```

4. **在 Service 中使用**

```typescript
constructor(
  @InjectModel(NewEntity.name)
  private newEntityModel: Model<NewEntityDocument>,
) {}

async create(playerId: string, data: any) {
  return this.newEntityModel.create({
    playerId: new Types.ObjectId(playerId),
    ...data,
  });
}
```

---

## 最佳实践

### 1. 错误处理

```typescript
// 使用标准异常
throw new NotFoundException('记录不存在');
throw new BadRequestException('参数错误');
throw new ForbiddenException('无权限');
```

### 2. 缓存策略

```typescript
// 读取缓存
const cached = await this.redisService.getJson<any>(cacheKey);
if (cached) return cached;

// 写入数据后清除缓存
await this.redisService.del(cacheKey);
```

### 3. 分布式锁

```typescript
const lockKey = `${CACHE_KEYS.LOCK}operation:${id}`;
const lockValue = Date.now().toString();

const acquired = await this.redisService.acquireLock(lockKey, lockValue, 30);
if (!acquired) throw new ForbiddenException('操作过于频繁');

try {
  // 执行业务逻辑
} finally {
  await this.redisService.releaseLock(lockKey, lockValue);
}
```

### 4. 日志记录

```typescript
private readonly logger = new Logger(NewFeatureService.name);

// 调试日志
this.logger.debug(`Debug info: ${data}`);

// 信息日志
this.logger.log(`Operation completed: ${id}`);

// 警告日志
this.logger.warn(`Unexpected state: ${state}`);

// 错误日志
this.logger.error(`Failed to process: ${error.message}`, error.stack);
```

---

## 总结

扩展框架时遵循以下原则：

1. **模块化**: 每个功能独立成模块
2. **依赖注入**: 使用 NestJS 的依赖注入系统
3. **事件驱动**: 使用 EventManager 解耦模块
4. **缓存优先**: 热点数据优先从缓存读取
5. **类型安全**: 所有接口都要有明确的类型定义
