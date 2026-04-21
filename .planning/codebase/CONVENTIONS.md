# Coding Conventions

**Analysis Date:** 2026/04/21

## Naming Patterns

### Files
- **Services, Controllers, Modules**: kebab-case with `.service.ts`, `.controller.ts`, `.module.ts` suffix
  - Example: `auth.service.ts`, `player.service.ts`, `message.gateway.ts`
- **Schemas**: kebab-case with `.schema.ts` suffix
  - Example: `player.schema.ts`, `estate.schema.ts`
- **Interfaces, Types, Enums, Utils**: `index.ts` barrel files in feature directories
  - Example: `src/shared/interfaces/index.ts`, `src/shared/enums/index.ts`
- **Config files**: kebab-case with `.config.ts` suffix
  - Example: `app.config.ts`, `database.config.ts`

### Functions
- **Methods**: camelCase
  - Example: `wechatLogin()`, `accountRegister()`, `generateTokens()`
- **Private methods**: camelCase with underscore prefix sometimes used
  - Example: `mockGetOpenId()`, `buildPlayerData()`
- **Utility functions**: camelCase, often exported directly
  - Example: `now()`, `timeDiff()`, `calculateEfficiencyTime()`

### Variables
- **Local variables**: camelCase
  - Example: `playerId`, `openId`, `accessToken`, `refreshToken`
- **Constants**: UPPER_SNAKE_CASE for configuration objects
  - Example: `JWT_CONFIG.ACCESS_TOKEN_EXPIRY`, `CACHE_KEYS.PLAYER`
- **Type aliases**: PascalCase
  - Example: `EntityId`, `Timestamp`, `PlayerIdSet`

### Types and Interfaces

**Interfaces** (preferred for object shapes):
```typescript
export interface ITokenPayload {
  playerId: string;
  openId: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}
```

**Type aliases** (for unions, utility types):
```typescript
export type EntityId = string;
export type Nullable<T> = T | null;
export type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] };
```

**Enums** (use for fixed sets of string values):
```typescript
export enum Realm {
  QI_REFINING = 'qi_refining',
  FOUNDATION = 'foundation',
  // ...
}
```

**Decorator-based classes** (Schema, Entity):
```typescript
@Schema({ timestamps: true, collection: 'players' })
export class Player {
  @Prop({ type: String, required: true, unique: true, index: true })
  openId: string;
}
```

## Code Style

### Formatting
- **Tool**: Not configured (no ESLint/Prettier at project root)
- **Manual formatting**: 2-space indentation used in source files
- **Quote style**: Single quotes for strings in TypeScript

### Linting
- **Tool**: Not configured at project level
- **TypeScript strictness**: Disabled (see tsconfig.json)
  - `strictNullChecks: false`
  - `noImplicitAny: false`
  - `strictBindCallApply: false`

### TypeScript Settings (tsconfig.json)
```json
{
  "noImplicitAny": false,
  "strictNullChecks": false
}
```

### `any` vs `unknown`
- **`any`** is used liberally throughout the codebase due to `noImplicitAny: false`
- **`unknown`** is used in generic contexts where type is truly unknown
  - Example: `items: unknown[]` in `IPlayerData`

## Import Organization

**Order** (grouped by priority):
1. NestJS framework imports (`@nestjs/*`)
2. External packages (mongoose, bcryptjs, etc.)
3. Internal path aliases (`@/`, `@modules/`, `@shared/`, etc.)
4. Relative imports (`../../`, `../`)

**Path aliases configured** (tsconfig.json):
```json
{
  "@/*": ["src/*"],
  "@common/*": ["src/common/*"],
  "@config/*": ["src/config/*"],
  "@core/*": ["src/core/*"],
  "@database/*": ["src/database/*"],
  "@redis/*": ["src/redis/*"],
  "@modules/*": ["src/modules/*"],
  "@shared/*": ["src/shared/*"]
}
```

**Example imports**:
```typescript
import { Injectable, Logger, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Player, PlayerDocument } from '../../database/schemas/player.schema';
import { RedisService } from '@/redis/redis.service';
import { CACHE_KEYS } from '@/shared/constants';
```

## Error Handling

### Pattern: Use NestJS Built-in Exceptions
```typescript
import { UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';

// In service methods
if (!player) {
  throw new NotFoundException('玩家不存在');
}

if (existingPlayer) {
  throw new ConflictException('用户名已存在');
}

if (!isPasswordValid) {
  throw new UnauthorizedException('用户名或密码错误');
}
```

### Pattern: Try-Catch with Logger
```typescript
try {
  const payload = await this.jwtService.verifyAsync<ITokenPayload>(refreshToken);
  // ...
} catch (error) {
  this.logger.warn(`Token refresh failed: ${error.message}`);
  throw new UnauthorizedException('无效的刷新令牌');
}
```

### Pattern: Custom Error Objects
```typescript
private sendError(
  client: IAuthenticatedSocket,
  code: number,
  seq: number,
  errorMessage: string,
  useProtobuf: boolean,
): void {
  const response = {
    code,
    seq,
    payload: null,
    error: {
      code: ErrorCodes.UNKNOWN_ERROR,
      message: errorMessage,
    },
    timestamp: Date.now(),
    processingTime: 0,
  };
  // ...
}
```

## Logging

**Framework**: NestJS Logger (`@nestjs/common`)

**Pattern**: Class-based logger instances
```typescript
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Usage
  this.logger.log(`New player created: ${player._id}`);
  this.logger.debug(`Player ${playerId} logged in with JWT`);
  this.logger.warn(`Token refresh failed: ${error.message}`);
  this.logger.error(`Complete building failed: ${err.message}`);
}
```

**Log levels used**: `log`, `debug`, `warn`, `error`

**Structured logging**: Uses template strings with context
```typescript
this.logger.debug(
  `Player ${playerId} started building ${buildingType}, duration: ${buildTime}s`,
);
```

## Decorators

### Custom Decorators
```typescript
// Current user extraction
@CurrentPlayerId() playerId: string

// Allow anonymous access
@AllowAnonymous()

// Guard usage
@UseGuards(JwtAuthGuard)
```

### NestJS Decorators
```typescript
// HTTP
@Controller('auth')
@Post('wechat-login')
@Get('verify-session')
@Body() dto

// WebSocket Gateway
@WebSocketGateway({ namespace: '/', cors: { origin: '*' } })
@SubscribeMessage('message')
@MessageBody()
@ConnectedSocket()

// Dependency Injection
@Injectable()
@InjectModel(Player.name)
@Inject(forwardRef(() => AuthService))
```

## Async/Await Patterns

**Standard async/await** (no custom wrappers):
```typescript
async wechatLogin(code: string, encryptedData?: string, iv?: string): Promise<ILoginResponse> {
  // Direct async/await
  const player = await this.playerModel.findOne({ openId });
  const tokens = await this.generateTokens(playerId, openId);
}
```

**Promise.all for parallel operations**:
```typescript
const [accessToken, refreshToken] = await Promise.all([
  this.jwtService.signAsync(accessTokenPayload, { expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY }),
  this.jwtService.signAsync(refreshTokenPayload, { expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY }),
]);
```

**Async with error wrapping**:
```typescript
async refreshTokens(refreshToken: string): Promise<ITokenResponse> {
  try {
    const payload = await this.jwtService.verifyAsync<ITokenPayload>(refreshToken, {...});
    // ...
  } catch (error) {
    this.logger.warn(`Token refresh failed: ${error.message}`);
    throw new UnauthorizedException('无效的刷新令牌');
  }
}
```

## Module Organization

### Standard NestJS Module Structure
```typescript
// Module file (player.module.ts)
@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [PlayerController],
  providers: [PlayerService],
  exports: [PlayerService],
})
export class PlayerModule {}
```

### Index Barrel Files
Each directory typically has an `index.ts` that re-exports its contents:
```typescript
// src/modules/auth/index.ts
export * from './auth.module';
export * from './auth.service';
export * from './auth.controller';
```

### Cross-Cutting Patterns
- **Event Bus**: `src/core/cross-service.event-bus.ts`
- **Message Router**: `src/core/message-router.ts`
- **Config Manager**: `src/core/config.manager.ts`
- **Redis Pub/Sub**: `src/redis/redis-pubsub.service.ts`

---

*Convention analysis: 2026/04/21*
