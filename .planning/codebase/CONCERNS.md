# Codebase Concerns

**Analysis Date:** 2026/04/21

## Security Concerns

### Hardcoded Default JWT Secret
- **Issue:** JWT secret defaults to `'default-secret-change-in-production'` if env var not set
- **File:** `src/modules/auth/auth.module.ts:18`
- **Impact:** Tokens can be forged if deployed without proper env configuration
- **Fix:** Fail fast if JWT_SECRET is not set in production

### Test Authentication Endpoints in Production
- **Issue:** Test auth controller provides token generation without proper production guards
- **Files:** `src/modules/auth/test-auth.controller.ts`
- **Details:**
  - `quick-token` endpoint (line 46) generates tokens without verification
  - `mock-login` endpoint (line 106) bypasses real authentication
  - `verify` endpoint (line 204) can verify any token
  - Environment check `isTestEnvironment()` (line 35) relies on config which may be misconfigured
- **Impact:** If exposed in production, attackers can generate valid tokens for any player
- **Fix:** Remove test controller from production builds or ensure robust environment detection

### Mock Token in Production WebSocket
- **Issue:** `WebSocketGatewayImpl` returns hardcoded `'mock_token'` for WeChat login
- **File:** `src/modules/gateway/websocket.gateway.ts:69`
- **Impact:** Authentication bypass - anyone gets `test_player` identity
- **Fix:** Implement real WeChat API integration or remove this gateway in production

### CORS Allows All Origins
- **Issue:** Multiple WebSocket gateways use `origin: '*'`
- **Files:**
  - `src/modules/gateway/message.gateway.ts:65`
  - `src/modules/gateway/websocket.gateway.ts:41`
  - `src/modules/gateway/test.gateway.ts:24`
- **Impact:** Cross-origin requests allowed from any domain
- **Fix:** Restrict to known frontend origins via environment configuration

### Token Passed in URL Query String
- **Issue:** Token extracted from query string `ws://url?token=xxx`
- **File:** `src/modules/gateway/message.gateway.ts:642-643`
- **Details:** Also in `jwt-auth.guard.ts:144`, `message.gateway.ts:202-203`
- **Impact:** Tokens get logged in server logs, browser history, CDN logs, proxy logs
- **Fix:** Require tokens only in WebSocket handshake auth object or headers

### Database Passwords in Connection Strings
- **Issue:** MongoDB URI may contain credentials
- **File:** `src/config/database.config.ts:7`
- **Details:** Default `'mongodb://localhost:27017/taixu'` but env override may contain credentials
- **Fix:** Ensure credentials are never logged or exposed in error messages

---

## Input Validation Gaps

### DTOs Use `any` Type
- **Issue:** Request bodies use `any` instead of typed DTOs with validation
- **Files:**
  - `src/modules/market/market.controller.ts:51` - `dto: any`
  - `src/modules/market/market.controller.ts:108` - `dto: any`
- **Impact:** No runtime validation on request parameters
- **Fix:** Create proper DTO classes with class-validator decorators

### Weak Password Validation
- **Issue:** Password only checked for length (6-32 characters)
- **File:** `src/modules/auth/auth.service.ts:200`
- **Details:** No complexity requirements (numbers, special chars, etc.)
- **Impact:** Weak passwords can be easily brute-forced
- **Fix:** Add complexity requirements (numbers, uppercase, special chars)

### No Rate Limiting on Auth Endpoints
- **Issue:** No rate limiting visible on login/register endpoints
- **Files:** `src/modules/auth/auth.controller.ts`, `src/modules/auth/auth.service.ts`
- **Impact:** Brute force attacks on credentials possible
- **Fix:** Implement rate limiting middleware on auth routes

---

## Error Handling Issues

### Silent Null Returns on Parse Errors
- **Issue:** JSON/protobuf parse errors silently return null
- **Files:**
  - `src/modules/gateway/message.gateway.ts:455-456`
  - `src/modules/gateway/message.gateway.ts:479`
  - `src/modules/gateway/message.gateway.ts:496-497`
  - `src/core/message-router.ts:98,107`
  - `src/shared/protobuf/protobuf.service.ts:64,73,86,104,117,130,177`
- **Impact:** Client receives unclear "unknown error" responses
- **Fix:** Log parse errors and return descriptive error codes

### Catch Blocks Without Logging
- **Issue:** Many catch blocks swallow errors silently
- **File:** `src/modules/gateway/message.gateway.ts:128-130` - rethrows but logs nothing
- **Details:** `src/modules/market/market.service.ts:94`, `src/modules/battle/dungeon.service.ts` patterns
- **Impact:** Errors disappear without trace, debugging difficult
- **Fix:** Log all caught errors with context

### Unhandled Promise Rejections
- **Issue:** `completeBuilding` called with `.catch()` but error not handled
- **File:** `src/modules/estate/estate.service.ts:124`
- **Details:** `this.completeBuilding(playerId, buildingType).catch((err) =>` - error is caught but nothing done
- **Impact:** Building completion failures go unnoticed
- **Fix:** Add proper error handling or logging

---

## Code Quality Issues

### TODO Comment - Incomplete Implementation
- **File:** `src/modules/market/market.controller.ts:68`
- **Details:** `// TODO: 从 result 中获取实际的数据，这里简化演示`
- **Impact:** Key event notification not implemented
- **Fix:** Implement the event notification or create tracked issue

### Console.log Usage
- **Issue:** Using console.log instead of proper logger
- **Files:**
  - `src/main.ts:75` - Server startup banner
  - `src/redis/redis.module.ts:31` - Redis connection success
- **Impact:** Output not structured, bypasses log levels, inconsistent with rest of codebase
- **Fix:** Replace with `Logger.log()` or similar structured logging

### Math.random for IDs
- **Issue:** Using `Math.random()` for client IDs and instance IDs (not cryptographically secure)
- **Files:**
  - `src/modules/gateway/websocket.gateway.ts:123` - `Math.random().toString(36).substring(2, 9)`
  - `src/redis/redis-pubsub.service.ts:27` - `instanceId`
  - `src/shared/utils/index.ts:163` - Used in `generateId()`
- **Impact:** Predictable IDs can be guessed
- **Fix:** Use `crypto.randomUUID()` or similar secure random generation

### Magic Numbers
- **Issue:** Hardcoded magic numbers without named constants
- **Files:**
  - `src/modules/gateway/message.gateway.ts:597` - `(this.server?.sockets as any)?.size`
  - `src/main.ts:35-36` - `65000`, `66000` for timeout values
  - `src/config/game.config.ts` - Various hardcoded values
- **Impact:** Code harder to maintain and tune
- **Fix:** Extract to named constants with documentation

### Duplicate Proto Files
- **Issue:** Proto file exists in two locations per git status
- **Files:**
  - `shared/proto/game.proto` (staged deletion)
  - `src/shared/proto/game.proto` (in git, unstaged)
- **Impact:** Confusion about which file is authoritative, potential sync issues
- **Fix:** Consolidate to single location and ensure synchronization process

---

## Authentication/Authorization Concerns

### Token Type Not Verified Consistently
- **Issue:** Token type field checked in some places but not others
- **Files:**
  - `src/common/guards/jwt-auth.guard.ts:125` - checks `payload.type === 'access'`
  - `src/modules/auth/auth.service.ts:347` - also checks type
  - But `wechatLogin` (line 132) doesn't validate token type
- **Impact:** Refresh tokens could potentially be used as access tokens
- **Fix:** Consistently validate token type on all protected endpoints

### AllowAnonymous on Test Controller
- **Issue:** Entire `TestAuthController` marked with `@AllowAnonymous()`
- **File:** `src/modules/auth/test-auth.controller.ts:22`
- **Impact:** Even in production, these endpoints bypass auth checks (though env check exists)
- **Fix:** Remove `@AllowAnonymous()` and rely solely on env checks, or better - exclude from production entirely

---

## Scalability Concerns

### In-Memory Player Socket Map
- **Issue:** `playerSockets` is a Map stored in memory
- **File:** `src/modules/gateway/message.gateway.ts:80`
- **Details:** `private playerSockets = new Map<string, string>();`
- **Impact:** Won't work with multiple server instances, loses state on restart
- **Fix:** Use Redis or other distributed store for socket mappings

### No Connection Limits
- **Issue:** No max connections per user/IP visible
- **File:** `src/modules/gateway/message.gateway.ts`
- **Impact:** Single client can exhaust server resources
- **Fix:** Implement connection limits per player and per IP

---

## Maintainability Concerns

### Inconsistent Error Response Format
- **Issue:** Some errors return `payload: null, error: {...}`, others throw exceptions
- **Files:** Various throughout `message.gateway.ts`
- **Impact:** Client must handle multiple error formats
- **Fix:** Standardize error response format across all handlers

### Missing Test Coverage Indicators
- **Issue:** No test files visible in exploration
- **Impact:** Changes cannot be validated without manual testing
- **Fix:** Add unit and integration tests for critical paths (auth, payments, combat)

### Deprecated Endpoints Not Removed
- **Issue:** `auth.controller.ts` has `@deprecated` comments on lines 83 and 91
- **Files:**
  - `src/modules/auth/auth.controller.ts:83`
  - `src/modules/auth/auth.controller.ts:91`
- **Impact:** Deprecated code accumulates, confuses developers
- **Fix:** Remove deprecated endpoints or complete their removal

---

## Performance Concerns

### Slow Query Warning Threshold
- **Issue:** Slow handler warning only logs at >100ms
- **File:** `src/core/message-router.ts:117-118`
- **Details:** `if (duration > 100)`
- **Impact:** Queries slower than 100ms not flagged
- **Fix:** Lower threshold or make configurable

### No Database Query Optimization Visibility
- **Issue:** MongoDB queries not logged or tracked
- **Files:** Various service files with `this.playerModel.findOne()`, etc.
- **Impact:** N+1 queries and missing indexes go unnoticed
- **Fix:** Add query logging in development, use MongoDB explain() for analysis

---

*Concerns audit: 2026/04/21*
