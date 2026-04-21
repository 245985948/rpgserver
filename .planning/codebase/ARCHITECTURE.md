# Architecture

**Analysis Date:** 2026/04/21

## Pattern Overview

**Overall:** NestJS-based Modular Monolith with Gateway-driven WebSocket Communication

**Key Characteristics:**
- NestJS framework with dependency injection throughout
- Message-code based routing via `MessageRouter` (not REST endpoints)
- Dual WebSocket gateways: `MessageGateway` (Socket.IO) and `WebSocketGatewayImpl` (native WS)
- Protobuf + JSON dual protocol support for WebSocket messages
- JWT-based authentication with refresh token rotation
- MongoDB/Mongoose for persistence, Redis for caching/sessions

## Layers

### Entry Layer
- **Location:** `src/main.ts`
- **Purpose:** Bootstrap NestJS application with WebSocket adapter
- **Responsibilities:**
  - Initialize Socket.IO adapter via `IoAdapter`
  - Configure global pipes (ValidationPipe), interceptors, filters
  - Enable CORS with Authorization header support
  - Set global prefix `api` for HTTP routes
  - Configure Keep-Alive timeouts (65s/66s)

### Gateway Layer (`src/modules/gateway/`)
- **Purpose:** Handle all WebSocket client connections and message routing
- **Location:** `src/modules/gateway/gateway.module.ts`
- **Contains:**
  - `MessageGateway` - Primary Socket.IO gateway at namespace `/`
  - `WebSocketGatewayImpl` - Native WebSocket gateway at namespace `/game-ws`
  - `TestGateway` - Testing gateway
  - `MessageRouter` - Core routing engine in `src/core/message-router.ts`
- **Depends on:** `AuthService`, `Player` model, `ProtobufService`
- **Pattern:** All incoming messages go to `message` event, routed by message code to handlers

### Auth Layer (`src/modules/auth/`)
- **Purpose:** Handle authentication (WeChat, account/password) and JWT management
- **Location:** `src/modules/auth/auth.module.ts`
- **Key Files:**
  - `auth.service.ts` - Core auth logic
  - `auth.controller.ts` - HTTP endpoints for auth
  - `test-auth.controller.ts` - Test endpoints
- **Features:**
  - JWT access tokens (2h expiry) and refresh tokens (7d expiry)
  - Refresh tokens stored in Redis for revocation capability
  - WeChat login (mock implementation)
  - Account registration with bcrypt password hashing
  - Account login with bcrypt comparison

### Business Modules Layer (`src/modules/`)
- **Player Module** (`src/modules/player/`)
  - Player data management, combat attributes, production skills
  - Services: `PlayerService`
  - Gateway: None (uses MessageRouter handlers)

- **Battle Module** (`src/modules/battle/`)
  - Battle system, party system, dungeon system
  - Services: `BattleService`, `DungeonService`
  - Gateways: `PartyGateway` (namespace `party`)

- **Estate Module** (`src/modules/estate/`)
  - "Immortal Mansion" - player base/building system
  - Services: `EstateService`
  - Gateways: `EstateGateway` (namespace `estate`)

- **Market Module** (`src/modules/market/`)
  - Trading, auction, risk control
  - Services: `MarketService`, `AuctionService`, `RiskControlService`
  - Gateways: `TradeGateway` (namespace `trade`)

- **Offline Module** (`src/modules/offline/`)
  - Offline reward processing
  - Services: `OfflineService`

### Core Infrastructure Layer (`src/core/`)
- **Location:** `src/core/core.module.ts` (Global)
- **Contains:**
  - `EventManager` - Event emission/handling
  - `ConfigManager` - Configuration management
  - `CrossServiceEventBus` - Cross-module event bus
  - `MessageRouter` - Message routing engine (NOT in core.module.ts, but in gateway.module.ts providers)

### Data Layer (`src/database/`)
- **Location:** `src/database/database.module.ts`
- **Purpose:** MongoDB/Mongoose connection and schema exports
- **Schemas:**
  - `Player` (`src/database/schemas/player.schema.ts`)
  - `Estate` (`src/database/schemas/estate.schema.ts`)
  - `Trade` (`src/database/schemas/trade.schema.ts`)

### Cache Layer (`src/redis/`)
- **Location:** `src/redis/redis.module.ts`
- **Purpose:** Redis connection and caching
- **Services:**
  - `RedisService` - Basic get/set operations
  - `RedisPubSubService` - Pub/sub for cross-instance communication

### Shared Layer (`src/shared/`)
- **Purpose:** Shared types, constants, utilities, protobuf definitions
- **Key Files:**
  - `constants/message-codes.ts` - All message codes (System, Auth, Player, Battle, Economy, Estate, Social, ServerPush, Error)
  - `protobuf/` - Protobuf encoding/decoding service
  - `enums/index.ts` - Realm, CombatAttribute, ProductionSkill, BuildingType, etc.
  - `interfaces/index.ts` - Shared interfaces
  - `types/index.ts` - Type definitions

### Common Layer (`src/common/`)
- **Purpose:** Cross-cutting concerns (filters, guards, interceptors, decorators)
- **Contains:**
  - `guards/jwt-auth.guard.ts` - JWT validation for HTTP
  - `decorators/current-user.decorator.ts` - Extract current user
  - `decorators/allow-anonymous.decorator.ts` - Skip auth
  - `filters/` - HttpExceptionFilter, AllExceptionsFilter
  - `interceptors/` - TransformInterceptor, LoggingInterceptor
  - `pipes/` - Validation pipes
  - `controllers/` - Health controller, Root controller

## Data Flow

### WebSocket Message Flow
```
Client (Socket.IO) 
    ↓ connect to ws://host/game?token=<jwt>
MessageGateway.handleConnection()
    ↓ verify token, extract playerId
    ↓ emit 'connected' event
Client 
    ↓ emit 'message' event with {code, seq, payload}
MessageGateway.handleMessage()
    ↓ parse (Protobuf or JSON)
    ↓ build IGameMessage {code, payload, playerId, seq, timestamp}
    ↓ route() via MessageRouter
    ↓ find handler by code
    ↓ execute handler (may call service layer)
    ↓ build response {code: responseCode, seq, payload, timestamp}
    ↓ emit 'message' event to client
```

### Authentication Flow (WeChat Login)
```
Client → WEECHAT_LOGIN_REQ {code}
    ↓
MessageGateway.route() → AuthService.wechatLogin()
    ↓ mockWechatAPI → openId
    ↓ findOrCreate Player in MongoDB
    ↓ generateTokens() → {accessToken, refreshToken}
    ↓ storeRefreshToken() in Redis
    ↓ return {playerId, tokens, isNewPlayer, playerData, inventory}
```

### Message Code Routing
- Codes are grouped by module (1000 = Auth, 2000 = Player, etc.)
- Even codes = requests, odd codes = responses
- Codes >= 900000 = server push
- `MessageRouter.register(code, handler, {requireAuth})` for each message
- `MessageRouter.route(message)` dispatches to registered handler

## Key Abstractions

### IGameMessage
```typescript
interface IGameMessage<T = unknown> {
  code: number;        // Message code
  payload: T;          // Message data
  playerId?: string;    // Authenticated player ID
  seq: number;          // Sequence for matching request/response
  timestamp: number;   // Client timestamp
}
```
- Used throughout the gateway layer for all message handling

### MessageRouter
```typescript
class MessageRouter {
  register<T, R>(code: number, handler: MessageHandler<T, R>, config?: {requireAuth?: boolean; rateLimit?: number}): void
  route<T, R>(message: IGameMessage<T>): Promise<R | null>
  // Also supports observable-based pub/sub for internal events
}
```
- Central routing engine, registered by gateways and potentially other modules

### Player Document
- Mongoose document with nested subdocuments: CombatAttributes, ProductionSkillData, Equipment, Currency
- Inventory stored as Map<string, number>
- Password hash/salt stored but excluded from JSON output

## Entry Points

**HTTP API:**
- `src/main.ts` - NestJS bootstrap, global prefix `api`
- Auth endpoints via `AuthController` (e.g., `/api/auth/...`)
- Health check: `/api/health`

**WebSocket:**
- Socket.IO: `ws://host/game` (namespace `/`)
- Native WebSocket: `ws://host/game-ws` (namespace `game-ws`)

**Module Entry:**
- `src/app.module.ts` - Root module importing all feature modules

## Error Handling

**Strategy:** Global exception filters + per-message error handling in MessageRouter

**Patterns:**
- `AllExceptionsFilter` - Catches unhandled exceptions
- `HttpExceptionFilter` - Handles NestJS HTTP exceptions
- Message handlers wrap errors and throw, caught by gateway layer
- Error responses include `{code, seq, payload: null, error: {code, message}}`

**Error Codes:** Defined in `message-codes.ts` (ErrorCodes enum) with ranges for each category

## Cross-Cutting Concerns

**Logging:**
- NestJS built-in logger with levels: error, warn, log, debug, verbose
- Structured logging in gateways (connection/disconnection, message recv/send)

**Validation:**
- Global ValidationPipe with whitelist, forbidNonWhitelisted, transform

**Authentication:**
- JWT via @nestjs/jwt
- Token extracted from Socket.IO handshake (auth.token, query.token, or Authorization header)
- AuthService manages token generation, verification, refresh, revocation

**Serialization:**
- Protobuf for efficient WebSocket binary transfer
- JSON fallback
- MongoDB toJSON transform excludes _id, __v, passwordHash, passwordSalt

---

*Architecture analysis: 2026/04/21*
