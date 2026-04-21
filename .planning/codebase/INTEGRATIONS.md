# External Integrations

**Analysis Date:** 2026/04/21

## APIs & External Services

**WeChat Integration (Simulated):**
- Purpose: WeChat login authentication
- SDK/Client: Custom implementation (mock)
- Auth: WeChat code-based authentication (simplified implementation)
- Note: 当前为模拟实现，实际应调用微信API `https://api.weixin.qq.com/sns/jscode2session`

## Data Storage

**MongoDB:**
- Type: Document database (MongoDB)
- ODM: Mongoose 9.2.2
- NestJS Integration: @nestjs/mongoose 11.0.4
- Connection URI: `mongodb://localhost:27017/taixu` (configurable via MONGODB_URI)
- Connection Pool:
  - Max pool size: 50
  - Min pool size: 10
  - Server selection timeout: 5000ms
  - Socket timeout: 45000ms

**Collections/Schemas:**
- `src/database/schemas/player.schema.ts` - Player data
- `src/database/schemas/estate.schema.ts` - Estate/property data
- `src/database/schemas/trade.schema.ts` - Trade transactions

## Caching & Pub/Sub

**Redis:**
- Client: ioredis 5.9.3
- Default host: localhost
- Default port: 6379
- Default db: 0
- Auth: Optional via REDIS_PASSWORD env var

**Redis Usage Patterns:**
- Session management (Refresh token storage)
- Distributed locking (acquireLock, releaseLock)
- Cache operations (set, get, del with TTL)
- Hash operations (hset, hget, hgetall)
- List operations (lpush, rpush, lpop, lrange)
- Sorted sets (zadd, zrank, zscore, zrange) - 用于排行榜
- Pub/Sub (publish/subscribe)

**Key Cache Keys (from CACHE_KEYS):**
- Session keys: `${CACHE_KEYS.SESSION}${playerId}:refresh`
- Blacklist: `${CACHE_KEYS.SESSION}blacklist:${refreshToken}`

## Authentication & Identity

**JWT Authentication:**
- Provider: @nestjs/jwt with passport-jwt
- Access Token Expiry: 2 hours
- Refresh Token Expiry: 7 days
- Token storage: In-memory (JWT) + Redis (Refresh tokens for revocation)

**Password Security:**
- Library: bcryptjs 3.0.3
- Salt rounds: 10

**Auth Methods:**
- WeChat login (code-based, simulated)
- Account registration (username/password)
- Account login (username/password)

## WebSocket Communication

**WebSocket Framework:**
- Socket.IO via @nestjs/platform-socket.io 11.1.14

**Protocol Support:**
- JSON (default)
- Protobuf (taixu.WebSocketMessage schema)

**Gateway Configuration (src/modules/gateway/message.gateway.ts):**
- Namespace: `/`
- CORS: Allow all origins
- Transports: websocket, polling
- allowEIO3: true (Socket.IO v3 compatibility)

**Message Routing:**
- Code-based message routing via MessageRouter
- Message codes defined in `src/shared/constants/message-codes.ts`
- Categories: System, Auth, Player, Battle, Estate, Market

## Event Bus & Message System

**Internal Event Bus:**
- CrossServiceEventBus (src/core/cross-service.event-bus.ts)
- EventManager (src/core/event.manager.ts)
- Used for inter-module communication

## Serialization & Validation

**Protocol Buffers:**
- protobufjs 7.4.0
- WebSocket message schema: taixu.WebSocketMessage
- Service: ProtobufService (src/shared/protobuf/protobuf.service.ts)

**DTO Validation:**
- class-validator 0.15.1
- class-transformer 0.5.1
- Global ValidationPipe enabled with whitelist and transform

## Environment Configuration

**Required Environment Variables:**
- `MONGODB_URI` - MongoDB connection string (default: mongodb://localhost:27017/taixu)
- `REDIS_HOST` - Redis server host (default: localhost)
- `REDIS_PORT` - Redis server port (default: 6379)
- `REDIS_PASSWORD` - Redis password (optional)
- `REDIS_DB` - Redis database number (default: 0)
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - Refresh token secret (falls back to JWT_SECRET)
- `port` - Application port (default: 3000)
- `nodeEnv` - Environment (development/production)
- `version` - Application version

**Secrets Location:**
- Environment files: `.env.local`, `.env`
- No secret files committed to repository

## Application Ports

**Default Configuration:**
- HTTP API: `http://localhost:3000/api`
- Health Check: `http://localhost:3000/api/health`
- WebSocket: `ws://localhost:3000/game`

---

*Integration audit: 2026/04/21*
