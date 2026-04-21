# Codebase Structure

**Analysis Date:** 2026/04/21

## Directory Layout

```
D:\rpgServers/
├── src/                          # Main source code
│   ├── main.ts                   # Application entry point
│   ├── app.module.ts             # Root module
│   ├── common/                   # Shared components (filters, guards, interceptors, decorators, controllers)
│   ├── config/                   # Configuration loaders
│   ├── core/                     # Core services (event manager, config manager, event bus, message router)
│   ├── database/                 # MongoDB/Mongoose connection and schemas
│   ├── modules/                  # Feature modules (auth, player, battle, estate, market, offline, gateway)
│   ├── redis/                    # Redis connection and services
│   └── shared/                   # Shared types, constants, enums, utilities, protobuf
├── shared/                       # Shared code between server and client
│   ├── proto/                    # Protobuf definitions (game.proto)
│   ├── protocol/                 # Protocol types and message codes
│   └── (sync .bat file)          # Proto sync script
├── client-template/              # Client-side code template
├── dist/                         # Compiled output
├── .claude/                      # Claude agent configuration
├── .planning/                    # GSD planning documents
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript configuration
```

## Directory Purposes

### `src/`
**Purpose:** Main server application source code

### `src/modules/` - Feature Modules
**Purpose:** Business logic organized by domain

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `auth/` | Authentication (WeChat, account/password, JWT) | `auth.module.ts`, `auth.service.ts`, `auth.controller.ts` |
| `player/` | Player data, attributes, inventory | `player.module.ts`, `player.service.ts`, `player.controller.ts` |
| `battle/` | Combat, parties, dungeons | `battle.module.ts`, `battle.service.ts`, `party.gateway.ts` |
| `estate/` | "Immortal Mansion" base building | `estate.module.ts`, `estate.service.ts`, `estate.gateway.ts` |
| `market/` | Trading, auction, risk control | `market.module.ts`, `market.service.ts`, `trade.gateway.ts` |
| `offline/` | Offline rewards processing | `offline.module.ts`, `offline.service.ts` |
| `gateway/` | WebSocket handling | `gateway.module.ts`, `message.gateway.ts`, `websocket.gateway.ts` |
| `example/` | Example module | Example files |

### `src/common/` - Cross-Cutting Components
**Purpose:** Reusable infrastructure components

| Directory | Purpose |
|-----------|---------|
| `controllers/` | Health, root controllers |
| `decorators/` | `@CurrentUser()`, `@AllowAnonymous()` |
| `filters/` | Exception filters |
| `guards/` | JWT auth guard |
| `interceptors/` | Transform, logging interceptors |
| `pipes/` | Validation pipes |

### `src/core/` - Core Services
**Purpose:** Application-wide singleton services

| File | Purpose |
|------|---------|
| `core.module.ts` | Global module exporting core services |
| `event.manager.ts` | Event emission/handling |
| `config.manager.ts` | Configuration management |
| `cross-service.event-bus.ts` | Pub/sub between modules |
| `message-router.ts` | Message code routing engine |

### `src/database/` - Data Layer
**Purpose:** MongoDB/Mongoose integration

| File/Directory | Purpose |
|----------------|---------|
| `database.module.ts` | Mongoose connection module |
| `schemas/` | Mongoose schema definitions |
| `schemas/player.schema.ts` | Player document schema |
| `schemas/estate.schema.ts` | Estate document schema |
| `schemas/trade.schema.ts` | Trade document schema |

### `src/redis/` - Cache Layer
**Purpose:** Redis caching and pub/sub

| File | Purpose |
|------|---------|
| `redis.module.ts` | Redis connection module |
| `redis.service.ts` | Basic get/set operations |
| `redis-pubsub.service.ts` | Pub/sub for cross-instance events |

### `src/config/` - Configuration
**Purpose:** Environment configuration loading

| File | Purpose |
|------|---------|
| `index.ts` | Export all configurations |
| `app.config.ts` | Application settings |
| `database.config.ts` | MongoDB connection |
| `redis.config.ts` | Redis connection |
| `game.config.ts` | Game-specific settings |

### `src/shared/` - Shared Code
**Purpose:** Types, constants, utilities shared across modules

| Directory | Purpose |
|-----------|---------|
| `constants/` | Message codes, cache keys, event names |
| `enums/` | Realm, CombatAttribute, ProductionSkill, etc. |
| `interfaces/` | Shared interfaces |
| `types/` | Type definitions |
| `utils/` | Utility functions |
| `protobuf/` | Protobuf encoding/decoding service |

### `shared/` - Client-Server Shared
**Purpose:** Code shared between server and client (proto definitions)

| Directory/File | Purpose |
|----------------|---------|
| `proto/game.proto` | Protobuf message definitions |
| `protocol/types.ts` | Protocol types |
| `protocol/message-codes.ts` | Message codes (mirror of src/shared/constants/message-codes.ts) |

## Key File Locations

**Entry Points:**
- `src/main.ts` - Application bootstrap
- `src/app.module.ts` - Root module

**Configuration:**
- `src/config/index.ts` - All config loaders
- `package.json` - Dependencies

**Core Logic:**
- `src/core/message-router.ts` - Message routing engine
- `src/modules/auth/auth.service.ts` - Authentication logic
- `src/modules/gateway/message.gateway.ts` - Primary WebSocket gateway

**Testing:**
- `src/**/*.spec.ts` - Test files ( Jest)
- `package.json` - Jest configuration

## Naming Conventions

**Files:**
- Modules: `*.module.ts`, `*.service.ts`, `*.controller.ts`, `*.gateway.ts`
- Schemas: `*.schema.ts`
- Tests: `*.spec.ts`
- Index re-exports: `index.ts`

**Classes:**
- Modules: `XxxModule`
- Services: `XxxService`
- Controllers: `XxxController`
- Gateways: `XxxGateway` or `XxxGatewayImpl`
- Schemas: `Xxx` (Document class), `XxxSchema`
- Guards: `XxxGuard`
- Filters: `XxxFilter`
- Interceptors: `XxxInterceptor`
- Decorators: PascalCase (e.g., `@CurrentUser()`)

**Directories:**
- All lowercase with hyphens (e.g., `battle.module.ts`, not `battleModule/`)
- Subdirectories for grouped related files (e.g., `schemas/`, `controllers/`)

**Variables/Functions:**
- camelCase: `playerId`, `accessToken`, `wechatLogin()`
- Constants: UPPER_SNAKE_CASE: `ACCESS_TOKEN_EXPIRY`, `JWT_CONFIG`
- Enum members: UPPER_SNAKE_CASE or camelCase depending on definition
  - `ErrorCodes.UNKNOWN_ERROR` (const object)
  - `Realm.QI_REFINING` (enum class)

## Where to Add New Code

**New Feature Module:**
1. Create directory: `src/modules/<feature>/`
2. Create files:
   - `<feature>.module.ts` - Module definition
   - `<feature>.service.ts` - Business logic
   - `<feature>.controller.ts` - HTTP endpoints (optional)
   - `<feature>.gateway.ts` - WebSocket gateway (optional)
   - `index.ts` - Re-exports
3. Register in `src/app.module.ts` imports
4. Register message handlers in appropriate gateway

**New Message Handler:**
1. Add message codes to `src/shared/constants/message-codes.ts`
2. In the gateway's `registerHandlers()` method, add:
   ```typescript
   this.messageRouter.register(NEW_CODE_REQ, async (msg) => {
     // handler logic
   }, { requireAuth: true/false });
   ```

**New Database Schema:**
1. Create `src/database/schemas/<name>.schema.ts`
2. Define schema class and export both class and schema
3. Add to `src/database/schemas/index.ts`
4. Import `DatabaseModule` in the feature module
5. Inject via `@InjectModel()` decorator

**New Redis-based Cache:**
1. Use `RedisService` methods: `get`, `set`, `del`, `getJson`, `setJson`
2. Use cache key constants from `src/shared/constants/`

**New WebSocket Gateway:**
1. Create gateway class with `@WebSocketGateway({ namespace: 'xxx' })`
2. Decorate methods with `@SubscribeMessage('eventName')`
3. Add to appropriate module's providers

## Special Directories

### `shared/proto/`
- **Purpose:** Protobuf message definitions (`.proto` files)
- **Generated:** Not auto-generated (manual `.proto` files)
- **Committed:** Yes
- **Note:** These define the wire protocol between server and client

### `client-template/`
- **Purpose:** Client-side code template for game client
- **Generated:** No
- **Committed:** Yes

### `dist/`
- **Purpose:** Compiled TypeScript output
- **Generated:** Yes (by `npm run build`)
- **Committed:** No (typically in .gitignore)

---

*Structure analysis: 2026/04/21*
