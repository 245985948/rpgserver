# Technology Stack

**Analysis Date:** 2026/04/21

## Languages

**Primary:**
- TypeScript 5.9.3 - Main development language for server and business logic

**Secondary:**
- Protobuf (protobufjs 7.4.0) - Binary serialization protocol for WebSocket messages

## Runtime

**Environment:**
- Node.js (version not explicitly defined in package.json, target ES2021)

**Package Manager:**
- npm (implied by package.json)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- NestJS 11.1.14 - Main application framework with dependency injection, modules, and decorators

**WebSocket:**
- Socket.IO (@nestjs/platform-socket.io 11.1.14, @nestjs/websockets 11.1.14) - Real-time bidirectional communication

**Testing:**
- Jest 30.2.0 - Test runner with ts-jest for TypeScript transformation
- @nestjs/testing 11.1.14 - NestJS-specific testing utilities

**Build/Dev:**
- TypeScript 5.9.3 - TypeScript compiler with decorator metadata support
- ts-node 10.9.2 - TypeScript execution engine for development
- nodemon 3.1.14 - Development server with auto-restart
- tsconfig-paths 4.2.0 - Path alias resolution for TypeScript

## Key Dependencies

**Core Framework:**
- @nestjs/common 11.1.14 - Common NestJS decorators and utilities
- @nestjs/core 11.1.14 - Core NestJS functionality
- @nestjs/platform-express 11.1.14 - Express adapter for HTTP
- reflect-metadata 0.2.2 - Decorator metadata reflection

**Configuration:**
- @nestjs/config 4.0.3 - Environment-based configuration management

**Authentication:**
- @nestjs/jwt 11.0.0 - JWT token generation and verification
- @nestjs/passport 11.0.5 - Passport integration for NestJS
- passport 0.7.0 - Authentication middleware
- passport-jwt 4.0.1 - JWT strategy for Passport
- bcryptjs 3.0.3 - Password hashing

**Database:**
- mongoose 9.2.2 - MongoDB ODM
- @nestjs/mongoose 11.0.4 - NestJS integration for Mongoose

**Caching & Pub/Sub:**
- ioredis 5.9.3 - Redis client

**Serialization:**
- protobufjs 7.4.0 - Protocol Buffers implementation
- class-transformer 0.5.1 - Object transformation and serialization
- class-validator 0.15.1 - DTO validation

**Utilities:**
- rxjs 7.8.2 - Reactive extensions for event handling

## Configuration

**TypeScript Compiler (tsconfig.json):**
- Target: ES2021
- Module: CommonJS
- Decorator support enabled (emitDecoratorMetadata, experimentalDecorators)
- Path aliases configured: `@/*`, `@common/*`, `@config/*`, `@core/*`, `@database/*`, `@redis/*`, `@modules/*`, `@shared/*`

**Jest Testing:**
- Test environment: Node.js
- Test regex: `.*\.spec\.ts$`
- Transform: ts-jest for .ts and .js files
- Module name mapper: Same path aliases as TypeScript

**Application Configuration (src/config/):**
- `app.config.ts` - Application settings
- `database.config.ts` - MongoDB connection settings
- `redis.config.ts` - Redis connection settings
- `game.config.ts` - Game-specific settings

**Environment Files:**
- `.env.local` (优先级高)
- `.env` (fallback)

## Platform Requirements

**Development:**
- Node.js with TypeScript support
- MongoDB instance (default: mongodb://localhost:27017/taixu)
- Redis server (default: localhost:6379)

**Production:**
- Node.js server capable of running compiled JavaScript
- MongoDB database
- Redis server
- Port configuration via environment variable (default: 3000)

---

*Stack analysis: 2026/04/21*
