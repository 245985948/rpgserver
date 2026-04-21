# Testing Patterns

**Analysis Date:** 2026-04-21

## Test Framework

**Framework:** Jest v30
**TypeScript Support:** ts-jest
**Testing Package:** @nestjs/testing v11.1.14

### Configuration

Jest configuration is in `package.json`:

```json
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
```

### Test Commands

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:cov      # Coverage report
```

## Test File Organization

**Current Status:** No test files found in project

The project uses Jest with `*.spec.ts` naming convention, but no test files currently exist in the `src/` directory. Test files should follow the co-located pattern alongside source files.

### Expected Pattern (Not Yet Implemented)

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   └── auth.service.spec.ts      # Co-located test
│   └── player/
│       ├── player.module.ts
│       ├── player.service.ts
│       └── player.service.spec.ts    # Co-located test
```

### Test File Naming

- **Pattern:** `*.spec.ts`
- **Examples:** `auth.service.spec.ts`, `player.service.spec.ts`

## Test Structure

Since no tests exist yet, the following patterns should be followed based on NestJS and Jest best practices:

### Service Testing Pattern

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(Player.name),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('wechatLogin', () => {
    it('should return login response for new player', async () => {
      // Arrange
      const mockPlayer = { _id: '123', openId: 'test_openid' };
      jest.spyOn(service, 'playerModel' as any, 'get').mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(mockPlayer),
      });

      // Act
      const result = await service.wechatLogin('test_code');

      // Assert
      expect(result.isNewPlayer).toBe(true);
    });
  });
});
```

### Controller Testing Pattern

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            wechatLogin: jest.fn(),
            accountLogin: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('wechatLogin', () => {
    it('should call authService.wechatLogin with correct params', async () => {
      const dto = { code: 'test_code' };
      await controller.wechatLogin(dto);
      expect(service.wechatLogin).toHaveBeenCalledWith(dto.code);
    });
  });
});
```

## Mocking

### Mongoose Models

```typescript
const mockPlayerModel = {
  findById: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  updateOne: jest.fn(),
};

{
  provide: getModelToken(Player.name),
  useValue: mockPlayerModel,
}
```

### Redis Service

```typescript
const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  getJson: jest.fn(),
  setJson: jest.fn(),
  acquireLock: jest.fn(),
  releaseLock: jest.fn(),
};

{
  provide: RedisService,
  useValue: mockRedisService,
}
```

### NestJS Config Service

```typescript
{
  provide: ConfigService,
  useValue: {
    get: jest.fn().mockReturnValue(4),  // e.g., maxPartySize
  },
}
```

## Fixtures and Factories

Not yet implemented. Suggested pattern:

```typescript
// test/fixtures/player.fixture.ts
export const createMockPlayer = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439011',
  openId: 'test_openid_123',
  nickname: '测试道友',
  realm: 'qi_refining',
  status: 'offline',
  combatAttributes: {},
  inventory: new Map(),
  ...overrides,
});

export const createMockPlayerDocument = (overrides = {}) => {
  const doc = createMockPlayer(overrides);
  return {
    ...doc,
    save: jest.fn().mockResolvedValue(doc),
    toObject: jest.fn().mockReturnValue(doc),
  } as any;
};
```

## Coverage

### Current Coverage Configuration

```json
"collectCoverageFrom": ["**/*.(t|j)s"],
"coverageDirectory": "../coverage"
```

### Coverage Target

Not specified - no enforced coverage threshold

### View Coverage

```bash
npm run test:cov
# Generates HTML report in coverage/ directory
```

## Integration Testing

Not yet implemented. For NestJS integration tests:

```typescript
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

describe('AppIntegration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should connect to database', () => {
    // Integration test
  });
});
```

## E2E Testing

Not implemented. If added, suggested location:

```
src/
└── test/
    └── app.e2e-spec.ts
```

## Common Patterns

### Async Testing

```typescript
it('should return player profile', async () => {
  const playerId = '123';
  const expectedPlayer = { _id: playerId, nickname: '测试' };

  jest.spyOn(service, 'getProfile').mockResolvedValue(expectedPlayer);

  const result = await service.getProfile(playerId);

  expect(result).toEqual(expectedPlayer);
});
```

### Error Testing

```typescript
it('should throw NotFoundException when player not found', async () => {
  jest.spyOn(service, 'playerModel', 'get').mockReturnValue({
    findById: jest.fn().mockResolvedValue(null),
  });

  await expect(service.getProfile('nonexistent')).rejects.toThrow(NotFoundException);
});
```

### Testing Guards and Decorators

```typescript
import { createMockExecutorContext } from '@nestjs/testing';

it('CurrentPlayerId decorator should extract playerId from request', () => {
  const mockRequest = { playerId: '123' };
  const context = createMockExecutorContext({
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
  });

  const result = CurrentPlayerId(null, context as any);
  expect(result).toBe('123');
});
```

---

*Testing analysis: 2026-04-21*
