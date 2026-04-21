# External Integrations

**Analysis Date:** 2026/04/21

## APIs & External Services

**WeChat Mini-Game Authentication:**
- Purpose: Player login via WeChat mini-game platform
- SDK/Client: Custom implementation (not a WeChat SDK package)
- Auth method: OAuth code exchange (mock implementation at `src/modules/auth/auth.service.ts:441-444`)
- Config env vars:
  - `WECHAT_APP_ID` - WeChat app identifier
  - `WECHAT_APP_SECRET` - WeChat app secret

## Data Storage

**MongoDB:**
- Type: Document database (NoSQL)
- ODM: Mongoose 9.2.2
- NestJS integration: @nestjs/mongoose 11.0.4
- Connection URI: `MONGODB_URI` env var (default: `mongodb://localhost:27017/taixu`)
- Connection pool:
  - `maxPoolSize: 50`
  - `minPoolSize: 10`
  - `serverSelectionTimeoutMS: 5000`
  - `socketTimeoutMS: 45000`
- Schemas location: `src/database/schemas/`
  - `player.schema.ts` - Player entity
  - `estate.schema.ts` - Estate/building entity
  - `trade.schema.ts` - Trade/market entity

**Redis:**
- Type: Key-value cache and session store
- Client: ioredis 5.9.3
- Connection: `REDIS_HOST`, `REDIS_PORT` env vars (default: localhost:6379)
- Auth: `REDIS_PASSWORD` env var (optional)
- Database index: `REDIS_DB` env var (default: 0)
- Service location: `src/redis/redis.service.ts`
- Capabilities used:
  - String operations (session storage)
  - Hash operations
  - List operations
  - Sorted sets (leaderboards)
  - Distributed locks (acquireLock/releaseLock)
  - Pub/sub (redis-pubsub.service.ts)

## Authentication & Identity

**JWT Authentication:**
- Provider: @nestjs/jwt with passport-jwt strategy
- Token types:
  - Access Token (2h expiry)
  - Refresh Token (7d expiry)
- Storage:
  - Access token: Client-side (sent in Authorization header)
  - Refresh token: Server-side (Redis storage for revocation)
- Secret management: `JWT_SECRET`, `JWT_REFRESH_SECRET` env vars
- Session key prefix: `SESSION` (see `CACHE_KEYS` in `src/shared/constants/`)

**Auth Methods:**
1. WeChat login - via code (mocked)
2. Account registration - username/password with bcrypt hashing
3. Account login - username/password verification

## Monitoring & Observability

**Logging:**
- Framework: NestJS built-in logger
- Log levels: error, warn, log, debug, verbose (configurable via `LOG_LEVEL` env var)
- Output: Console (stdout)
- Interceptors: TransformInterceptor, LoggingInterceptor (`src/common/interceptors/`)

**Error Handling:**
- Global filters: HttpExceptionFilter, AllExceptionsFilter (`src/common/filters/`)

## WebSocket Communication

**Socket.IO Integration:**
- Adapter: @nestjs/platform-socket.io
- Gateway: MessageGateway (`src/modules/gateway/message.gateway.ts`)
- WebSocket endpoint: `ws://localhost:3000/game`
- HTTP endpoint: `http://localhost:3000/api`
- Health check: `http://localhost:3000/api/health`
- CORS: Enabled with credentials support
- Keep-Alive timeout: 65 seconds
- Headers timeout: 66 seconds

## Protocol Buffers

**Serialization:**
- Proto file: `shared/proto/game.proto`
- Runtime: protobufjs 7.4.0
- Module: ProtobufModule (`src/shared/protobuf/`)
- Usage: Game request/response wrapping for WebSocket messages

**Message Types Defined:**
- GameRequest, GameResponse - Request/response wrapper
- WebSocketMessage - WebSocket event wrapper
- PlayerData, PlayerBasicInfo, PlayerCurrency, PlayerAttributes
- Item, Equipment - Inventory system
- BattleUnit, BattleAction, BattleState - Combat system
- MarketListing, AuctionItem - Economy system
- EstateBuilding, EstateData - Estate system

## Environment Configuration

**Required env vars:**
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `APP_VERSION` | App version | 1.0.0 |
| `LOG_LEVEL` | Log verbosity | debug |
| `MONGODB_URI` | MongoDB connection | mongodb://localhost:27017/taixu |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `REDIS_PASSWORD` | Redis auth | (none) |
| `REDIS_DB` | Redis database | 0 |
| `JWT_SECRET` | JWT signing secret | (required in production) |
| `JWT_REFRESH_SECRET` | Refresh token secret | (required in production) |
| `WECHAT_APP_ID` | WeChat app ID | (required for WeChat auth) |
| `WECHAT_APP_SECRET` | WeChat secret | (required for WeChat auth) |

**Secrets location:**
- `.env` file in project root (not committed to git per .gitignore)

## Cross-Cutting Infrastructure

**Config Module:**
- NestJS ConfigModule with dotenv loading
- Env file priority: `.env.local` > `.env`
- Configuration files: `src/config/`
  - `app.config.ts` - Application settings
  - `database.config.ts` - MongoDB settings
  - `redis.config.ts` - Redis connection
  - `game.config.ts` - Game-specific settings

---

*Integration audit: 2026/04/21*
