# Coding Conventions

**Analysis Date:** 2026-04-21

## Naming Patterns

### Files

- **Service files:** `[module].service.ts` - e.g., `auth.service.ts`, `player.service.ts`
- **Controller files:** `[module].controller.ts` - e.g., `auth.controller.ts`, `player.controller.ts`
- **Gateway files:** `[module].gateway.ts` - e.g., `message.gateway.ts`, `party.gateway.ts`
- **Module files:** `[module].module.ts` - e.g., `auth.module.ts`, `battle.module.ts`
- **Schema files:** `[entity].schema.ts` - e.g., `player.schema.ts`, `estate.schema.ts`
- **Index files:** `index.ts` for barrel exports
- **Enum files:** `enums/index.ts` for all enums
- **Interface files:** `interfaces/index.ts` for all interfaces
- **Constants files:** `constants/index.ts` for all constants

### Functions

- **CamelCase** for all function names - e.g., `getProfile`, `updateStatus`, `wechatLogin`
- **Private methods:** prefixed with `private` keyword
- **Async functions:** always return `Promise<T>`
- **Verb prefixes:** `get*`, `update*`, `create*`, `validate*`, `calculate*`, `build*`

### Variables

- **CamelCase** for local variables - e.g., `playerId`, `cacheKey`, `combatAttrs`
- **PascalCase** for class properties and types
- **UPPER_SNAKE_CASE** for constants - e.g., `JWT_CONFIG.ACCESS_TOKEN_EXPIRY`
- **Descriptive names:** avoid single letters except in loops

### Types

- **Interfaces:** `I` prefix - e.g., `ITokenPayload`, `IPlayerData`, `ILoginResponse`
- **Type aliases:** no prefix - e.g., `type Result = { success: boolean }`
- **Enums:** PascalCase with descriptive values - e.g., `Realm.QI_REFINING = 'qi_refining'`

## Code Style

### Formatting

- **Tool:** TypeScript compiler with tsconfig
- **Indentation:** 2 spaces
- **Semicolons:** Yes
- **Quotes:** Single for strings in TypeScript, double in JSON

### Linting

- **Strict checks disabled in tsconfig:**
  - `strictNullChecks: false`
  - `noImplicitAny: false`
  - `strictBindCallApply: false`
  - `noFallthroughCasesInSwitch: false`

### Import Organization

1. Node.js built-ins (e.g., `fs`, `path`)
2. External packages (e.g., `@nestjs/common`, `mongoose`)
3. Internal path aliases (e.g., `@/modules/...`, `@/shared/...`)
4. Relative imports (e.g., `../../database/...`)

### Path Aliases (tsconfig.json)

```json
"@/*": ["src/*"],
"@common/*": ["src/common/*"],
"@config/*": ["src/config/*"],
"@core/*": ["src/core/*"],
"@database/*": ["src/database/*"],
"@redis/*": ["src/redis/*"],
"@modules/*": ["src/modules/*"],
"@shared/*": ["src/shared/*"]
```

## Error Handling

### NestJS Exceptions

- Use NestJS built-in exceptions: `NotFoundException`, `BadRequestException`, `UnauthorizedException`, `ConflictException`
- Always throw with descriptive Chinese messages

```typescript
// Not found
throw new NotFoundException('玩家不存在');

// Bad request
throw new BadRequestException('当前装备不支持该流派');

// Unauthorized
throw new UnauthorizedException('用户名或密码错误');

// Conflict
throw new ConflictException('用户名已存在');
```

### Try-Catch Pattern

```typescript
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  this.logger.warn(`Operation failed: ${error.message}`);
  throw new BadRequestException('操作失败，请稍后再试');
}
```

### Error Logging

- Use `Logger` from `@nestjs/common`
- `logger.log()` for important events
- `logger.debug()` for debug information
- `logger.warn()` for recoverable issues
- `logger.error()` for failures

```typescript
private readonly logger = new Logger(AuthService.name);

// Usage
this.logger.log(`New player created: ${player._id}`);
this.logger.debug(`Player ${playerId} switched to ${style}`);
this.logger.warn(`Token verification failed: ${error.message}`);
this.logger.error(`Complete building failed: ${err.message}`);
```

## TypeScript Usage

### Any vs Unknown

- **`any`:** Used in DTO and when type is truly flexible - e.g., `async updateStatus(playerId: string, dto: any)`
- **`unknown`:** Prefer when type is uncertain at runtime
- **`as` casting:** Common for schema documents - e.g., `player.combatAttributes as Record<CombatAttribute, number>`

### Interface vs Type

- **Interfaces:** Preferred for public APIs and schema definitions
- **Types:** Used for unions, intersections, and utility types
- **Document types:** Mongoose documents use `Player & Document` pattern

```typescript
// Interface for public API
export interface ITokenPayload {
  playerId: string;
  openId: string;
  type: 'access' | 'refresh';
}

// Type for schema
export type PlayerDocument = Player & Document;
```

### Decorators

- **Class decorators:** `@Injectable()`, `@WebSocketGateway()`, `@Controller()`
- **Method decorators:** `@Post()`, `@Get()`, `@SubscribeMessage()`
- **Parameter decorators:** `@Body()`, `@CurrentPlayerId()`, `@Headers()`

## Async/Await Pattern

### Standard Pattern

```typescript
async getProfile(playerId: string): Promise<Player> {
  // Try cache first
  const cached = await this.redisService.getJson<Player>(cacheKey);
  if (cached) {
    return cached;
  }

  // Fallback to database
  const player = await this.playerModel.findById(playerId).lean();
  if (!player) {
    throw new NotFoundException('玩家不存在');
  }

  return player as Player;
}
```

### Promise.all for Parallel Operations

```typescript
const [accessToken, refreshToken] = await Promise.all([
  this.jwtService.signAsync(accessTokenPayload, { expiresIn: '2h' }),
  this.jwtService.signAsync(refreshTokenPayload, { expiresIn: '7d' }),
]);
```

### Async with Redis Locks

```typescript
const lockKey = `${CACHE_KEYS.LOCK}build:${playerId}:${buildingType}`;
const lockValue = Date.now().toString();
const acquired = await this.redisService.acquireLock(lockKey, lockValue, 30);

if (!acquired) {
  throw new BadRequestException('操作过于频繁，请稍后再试');
}

try {
  // Perform operation
} finally {
  await this.redisService.releaseLock(lockKey, lockValue);
}
```

## Module Design

### Module Structure

```
src/modules/[module]/
├── [module].module.ts      # Module definition
├── [module].service.ts     # Business logic
├── [module].controller.ts  # HTTP endpoints (if needed)
├── [module].gateway.ts     # WebSocket handlers (if needed)
└── index.ts                # Barrel export
```

### Barrel Exports (index.ts)

```typescript
export * from './player.module';
export * from './player.service';
export * from './player.controller';
```

### NestJS Dependency Injection

```typescript
@Injectable()
export class PlayerService {
  constructor(
    @InjectModel(Player.name)
    private playerModel: Model<PlayerDocument>,
    private eventManager: EventManager,
    private redisService: RedisService,
  ) {}
}
```

## Comments

### JSDoc for Public Methods

```typescript
/**
 * 获取玩家完整资料
 */
async getProfile(playerId: string): Promise<Player> {}

/**
 * 切换流派
 * 根据装备实时切换流派
 */
async switchStyle(playerId: string, style: CombatStyle): Promise<void> {}
```

### Deprecated Markers

```typescript
/**
 * @deprecated 使用 verifyAccessToken 替代
 */
async verifySession(sessionKey: string): Promise<{ valid: boolean }> {}
```

### Section Dividers

```typescript
// ============================================
// 向后兼容的方法 (已弃用)
// ============================================
```

## Logging Patterns

### Logger Injection

```typescript
private readonly logger = new Logger(AuthService.name);
```

### Log Levels

```typescript
this.logger.log(`New player created: ${player._id}`);           // Info - important events
this.logger.debug(`Player ${playerId} logged in`);             // Debug - verbose info
this.logger.warn(`Token refresh failed: ${error.message}`);    // Warn - recoverable issues
this.logger.error(`Complete building failed: ${err.message}`); // Error - failures
```

### Structured Logging

```typescript
this.logger.debug(
  `Player ${playerId} started building ${buildingType}, duration: ${buildTime}s`,
);
```

---

*Convention analysis: 2026-04-21*
