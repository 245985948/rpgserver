# Testing Patterns

**Analysis Date:** 2026/04/21

## Test Framework

**Runner**: Jest v30.2.0

**Configuration** (`package.json`):
```json
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node",
    "moduleNameMapper": {
      "^@/(.*)$": "<rootDir>/$1",
      "^@common/(.*)$": "<rootDir>/common/$1",
      "^@config/(.*)$": "<rootDir>/config/$1",
      "^@core/(.*)$": "<rootDir>/core/$1",
      "^@database/(.*)$": "<rootDir>/database/$1",
      "^@redis/(.*)$": "<rootDir>/redis/$1",
      "^@modules/(.*)$": "<rootDir>/modules/$1",
      "^@shared/(.*)$": "<rootDir>/shared/$1"
    }
  }
}
```

**Test Commands**:
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:cov      # Coverage report
```

## Test File Organization

**Location**: Tests are co-located with source files in `src/`

**Naming convention**: `*.spec.ts` (per Jest configuration)

**Pattern**: `<file>.spec.ts` alongside `<file>.ts`

**Current Status**: **No test files exist in the codebase**
- Search for `*.spec.ts` in `src/` returns no results
- The Jest configuration is present but no tests have been written
- Coverage has never been generated

**Expected locations** (based on project structure):
```
src/
  modules/
    auth/
      auth.service.spec.ts      # Would test AuthService
      auth.controller.spec.ts   # Would test AuthController
    player/
      player.service.spec.ts
    estate/
      estate.service.spec.ts
    battle/
      battle.service.spec.ts
  database/
    schemas/
      player.schema.spec.ts
  shared/
    utils/
      utils.spec.ts             # Would test utility functions
  core/
    message-router.spec.ts
```

## Test Structure

Since no test files exist, patterns are inferred from:
1. Jest configuration
2. Source code structure
3. NestJS testing patterns (using `@nestjs/testing`)

**Expected NestJS Test Structure**:
```typescript
// Using @nestjs/testing
import { Test, TestingModule } from '@nestjs/testing';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn(), verifyAsync: jest.fn() },
        },
        {
          provide: RedisService,
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

## Mocking

**Framework**: Jest mocks (built-in)

**Module mocking** (typical pattern):
```typescript
jest.mock('@/redis/redis.service', () => ({
  RedisService: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
  })),
}));
```

**Service mocking in tests**:
```typescript
const mockRedisService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
};
```

**Spy pattern**:
```typescript
jest.spyOn(service, 'generateTokens').mockResolvedValue(mockTokens);
```

## Fixtures and Factories

**Test data location**: Not established (no test files exist)

**Expected pattern** (based on schema structure):
```typescript
// factories/player.factory.ts
import { faker } from '@faker-js/faker';
import { Player } from '../database/schemas/player.schema';

export const createMockPlayer = (overrides = {}): Partial<Player> => ({
  _id: new Types.ObjectId(),
  openId: faker.string.alphanumeric(16),
  nickname: faker.internet.username(),
  realm: 'foundation',
  status: 'online',
  combatAttributes: { realm: 1, physique: 1, spirit: 1, ... },
  currencies: [
    { type: 'spirit_stone', amount: 1000 },
    { type: 'contribution', amount: 100 },
  ],
  inventory: new Map([['item_001', 10]]),
  ...overrides,
});
```

## Coverage

**Configuration**: Coverage is configured but has never been run

**Coverage command**: `npm run test:cov`

**Output directory**: `coverage/`

**Current coverage**: 0% (no tests exist)

**Minimum thresholds**: Not configured

## Test Types

Since no test files exist, the following would be appropriate based on the architecture:

### Unit Tests
- **Scope**: Individual services, utilities, helpers
- **Location**: Co-located `.spec.ts` files
- **Example**:
  - `auth.service.spec.ts` - Test JWT generation, token refresh, login logic
  - `utils.spec.ts` - Test calculation functions
  - `player.schema.spec.ts` - Test schema transformations

### Integration Tests
- **Scope**: Database operations with MongoDB
- **Location**: Could use `__tests__/` directories or `.spec.ts` with `test/*` prefix
- **Requires**: Test database connection

### E2E Tests
- **Framework**: Not configured
- **Alternative**: Could use Jest + Supertest for HTTP API tests

## Key Testing Gaps

### Critical Missing Tests
1. **No service tests** - All business logic untested
2. **No utility function tests** - Helper functions like `calculateEfficiencyTime` untested
3. **No authentication flow tests** - JWT login/register/refresh untested
4. **No database schema tests** - Mongoose transformations untested
5. **No WebSocket gateway tests** - Message handling untested
6. **No Redis operations tests** - Caching and locking logic untested

### Test Infrastructure Gaps
1. **No test database setup** - No separate MongoDB instance for testing
2. **No E2E test framework** - No Cypress, Playwright, or similar
3. **No API contract tests** - Client/server protocol untested
4. **No mocking infrastructure** - No mock libraries configured

### Recommendations
1. Add Jest tests for `AuthService` methods (login, register, token refresh)
2. Add unit tests for utility functions in `src/shared/utils/index.ts`
3. Configure test MongoDB instance using `mongodb-memory-server`
4. Add integration tests for database operations
5. Set up E2E tests for critical user flows

---

*Testing analysis: 2026/04/21*
