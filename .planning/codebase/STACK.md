# Technology Stack

**Analysis Date:** 2026/04/21

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code

**Secondary:**
- Protocol Buffers 7.4.0 - Message serialization (game.proto)

## Runtime

**Environment:**
- Node.js (version not explicitly specified in package.json)

**Package Manager:**
- npm (via package-lock.json)
- Lockfile: Present (package-lock.json)

## Frameworks

**Core:**
- NestJS 11.1.14 - Primary application framework
- @nestjs/platform-express 11.1.14 - HTTP server adapter
- @nestjs/platform-socket.io 11.1.14 - WebSocket support (Socket.IO)
- @nestjs/websockets 11.1.14 - WebSocket gateway infrastructure
- reflect-metadata 0.2.2 -Decorator metadata reflection

**Testing:**
- Jest 30.2.0 - Test runner
- ts-jest - TypeScript transformer for Jest
- @nestjs/testing 11.1.14 - NestJS testing utilities

**Build/Dev:**
- TypeScript 5.9.3 - Type compiler with decorator support
- ts-node 10.9.2 - TypeScript execution runtime
- tsconfig-paths 4.2.0 - Path alias resolution for ts-node
- nodemon 3.1.14 - Development auto-reload

## Key Dependencies

**Authentication:**
- @nestjs/jwt 11.0.0 - JWT token generation/verification
- @nestjs/passport 11.0.5 - Authentication strategies
- passport 0.7.0 - Authentication framework
- passport-jwt 4.0.1 - JWT strategy for Passport
- bcryptjs 3.0.3 - Password hashing

**Database:**
- mongoose 9.2.2 - MongoDB ODM
- @nestjs/mongoose 11.0.4 - NestJS MongoDB integration

**Validation & Transformation:**
- class-validator 0.15.1 - DTO validation decorators
- class-transformer 0.5.1 - Object transformation

**Caching & Sessions:**
- ioredis 5.9.3 - Redis client library

**Serialization:**
- protobufjs 7.4.0 - Protocol Buffers runtime

**Utilities:**
- rxjs 7.8.2 - Reactive extensions (NestJS dependency)

## Configuration

**TypeScript Config:**
- File: `tsconfig.json`
- Target: ES2021
- Module: CommonJS
- Decorator support: Enabled (emitDecoratorMetadata, experimentalDecorators)
- Path aliases configured:
  - `@/*` -> `src/*`
  - `@common/*` -> `src/common/*`
  - `@config/*` -> `src/config/*`
  - `@core/*` -> `src/core/*`
  - `@database/*` -> `src/database/*`
  - `@redis/*` -> `src/redis/*`
  - `@modules/*` -> `src/modules/*`
  - `@shared/*` -> `src/shared/*`

**Jest Config:**
- Module file extensions: js, json, ts
- Test regex: `.*\.spec\.ts$`
- Transform pattern: `^.+\.(t|j)s$` -> ts-jest
- Root dir: `src/`

**Environment:**
- Config module loads from `.env.local`, `.env`
- ConfigService for environment access

## Project Scripts

```bash
npm run build              # Compile TypeScript to dist/
npm run start              # Run with ts-node (production-like)
npm run start:dev          # Development with nodemon auto-reload
npm run start:prod         # Run compiled JavaScript from dist/
npm run test               # Run Jest tests
npm run test:watch         # Jest watch mode
npm run test:cov           # Jest with coverage report
```

## Platform Requirements

**Development:**
- Node.js runtime
- MongoDB instance (local or remote)
- Redis instance (local or remote)

**Production:**
- Node.js runtime
- MongoDB database
- Redis cache/session store
- Port 3000 (configurable via PORT env var)

---

*Stack analysis: 2026/04/21*
