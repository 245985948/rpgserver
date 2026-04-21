# 代码库问题与风险

**分析日期:** 2026/04/21

## 安全考虑

### 硬编码密钥/默认凭据

**JWT 密钥使用默认值:**
- 文件: `src/modules/auth/auth.module.ts`
- 第 18 行: `secret: configService.get('JWT_SECRET', 'default-secret-change-in-production')`
- 风险: 如果环境变量 JWT_SECRET 未设置，将使用可预测的默认密钥
- 影响: 攻击者可伪造有效的 JWT token
- 修复方案: 启动时验证 JWT_SECRET 是否已设置，拒绝使用默认值

**测试环境认证控制器暴露:**
- 文件: `src/modules/auth/test-auth.controller.ts`
- 问题: 提供免 token 的测试接口，仅依赖 `nodeEnv` 环境变量检查
- 第 36-38 行: `isTestEnvironment()` 检查可被环境变量配置错误绕过
- 第 54, 117, 160, 206 行: 多处 `UnauthorizedException` 仅在检查后抛出
- 风险: 若误将生产环境配置为 "development"，攻击者可获取任意玩家 token
- 修复方案: 生产环境应完全禁用此类接口，不仅仅是检查

### 输入验证缺口

**大量使用 `any` 类型 DTO:**
- `src/modules/market/market.controller.ts:51` - `listItem` 方法 `dto: any`
- `src/modules/market/market.controller.ts:108` - `createAuction` 方法 `dto: any`
- `src/modules/battle/battle.controller.ts:23` - `switchCombatStyle` 方法 `dto: any`
- `src/modules/battle/battle.controller.ts:73` - `joinParty` 方法 `dto: any`
- `src/modules/estate/estate.controller.ts:35, 43, 51, 61` - 多个方法 `dto: any`
- `src/modules/player/player.controller.ts:27` - `updateStatus` 方法 `dto: any`
- `src/modules/offline/offline.controller.ts:18` - `setOfflineTask` 方法 `dto: any`
- `src/modules/example/example.controller.ts:43, 76` - `dto: any`
- 风险: 无编译时类型检查，可能导致运行时错误和潜在的安全漏洞
- 修复方案: 定义完整的 DTO 类并使用 class-validator 装饰器

**WebSocket 消息载荷直接类型转换:**
- 文件: `src/modules/gateway/message.gateway.ts`
- 第 117 行: `const { code } = msg.payload as { code: string }`
- 第 139 行: `const { username, password } = msg.payload as { username: string; password: string }`
- 第 161 行: `const { username, password } = msg.payload as { username: string; password: string }`
- 风险: 未验证 payload 结构，可发送任意字段
- 修复方案: 使用 class-validator 或 Zod 验证 payload 结构

### 注入风险

**玩家 ID 直接用于数据库查询:**
- 文件: `src/modules/gateway/message.gateway.ts`
- 第 194 行: `const player = await this.playerModel.findById(msg.playerId)`
- 风险: 如果 playerId 格式不正确，MongoDB 会抛出错误而非静默失败
- 修复方案: 使用 Mongoose Types.ObjectId.isValid() 验证后再查询

**estate.service.ts 中 parseInt 缺少错误处理:**
- 文件: `src/modules/estate/estate.service.ts`
- 第 164 行: `const elapsed = (Date.now() - parseInt(lastSteal)) / 1000`
- 风险: 如果 Redis 返回非数字值，parseInt 将返回 NaN，导致比较操作异常
- 修复方案: 验证 parseInt 结果是否为有效数字

## 性能问题

**Redis 连接日志输出:**
- 文件: `src/redis/redis.module.ts`
- 第 31 行: `console.log('Redis connected successfully')`
- 问题: 生产环境不应有 console.log 输出
- 修复方案: 使用 NestJS Logger 或完全移除

**main.ts 中启动日志:**
- 文件: `src/main.ts`
- 第 75 行: `console.log(...)` 多行日志输出
- 风险: 生产环境暴露服务器信息
- 修复方案: 仅在非生产环境输出

## 可维护性问题

### 错误处理模式不一致

**使用通用 Error 而非 NestJS 异常:**
- 文件: `src/common/decorators/current-user.decorator.ts`
- 第 35, 56, 77 行: `throw new Error('Unsupported context type')`
- 问题: 应使用 `InternalServerErrorException` 或类似 NestJS 异常
- 修复方案: 替换为适当的 NestJS 异常类

**Gateway 中使用通用 Error:**
- 文件: `src/modules/gateway/message.gateway.ts`
- 第 192 行: `throw new Error('未登录')`
- 第 196 行: `throw new Error('玩家不存在')`
- 问题: Gateway 层应返回结构化错误响应，而非抛出通用异常
- 修复方案: 返回 { success: false, error: '...' } 格式响应

### 未处理的边缘情况

**parseInt 返回值未检查:**
- 文件: `src/modules/auth/test-auth.controller.ts`
- 第 60 行: `const testLevel = parseInt(level || '50', 10)`
- 问题: 如果 level 是非数字字符串，返回 NaN 而非默认值 50
- 修复方案: 使用 `const testLevel = parseInt(level || '50', 10) || 50`

**竞态条件风险:**
- 文件: `src/modules/estate/estate.service.ts`
- 第 183-199 行: 获取目标地产、更新日志之间无原子性保证
- 风险: 高并发时可能出现数据不一致
- 修复方案: 使用 MongoDB 事务或重新设计操作原子性

## 缺失的错误处理

**市场控制器中的 TODO:**
- 文件: `src/modules/market/market.controller.ts`
- 第 68 行: `// TODO: 从 result 中获取实际的数据，这里简化演示`
- 问题: 购买物品后的事件通知未实现
- 影响: 客户端无法收到实时购买成功通知
- 修复方案: 实现完整的事件通知逻辑

**事件管理器调用被注释:**
- 文件: `src/modules/market/market.controller.ts`
- 第 72 行: `// await this.eventManager.notifyPlayerAttrChanged(...)`
- 问题: 跨服务事件通知功能未启用
- 修复方案: 实现并启用事件通知

## 技术债务

### 循环依赖风险

**需要检查的潜在循环依赖:**
- `AuthModule` 导出 `AuthService` 和 `JwtModule`
- 各模块通过 `CurrentPlayerId` 装饰器依赖 Auth 相关模块
- 需要验证实际依赖图中是否存在循环

### 缺失的速率限制

**认证接口无速率限制:**
- 文件: `src/modules/auth/auth.controller.ts`
- 第 35, 47 行: 注册和登录接口
- 文件: `src/modules/auth/test-auth.controller.ts`
- 第 46, 106 行: 测试 token 生成接口
- 风险: 暴力破解攻击
- 修复方案: 实现基于 IP 或账户的速率限制

### 测试覆盖缺口

**DTO 验证缺失:**
- 所有控制器中大量使用 `any` 类型
- 无法通过 TypeScript 编译时检查发现类型错误
- 建议: 逐步替换为带 class-validator 装饰器的 DTO

## 已知 TODO/FIXME

| 文件 | 行号 | 内容 |
|------|------|------|
| `src/modules/market/market.controller.ts` | 68 | TODO: 从 result 中获取实际的数据 |

## 建议优先级

**高优先级 (安全风险):**
1. 移除或保护默认 JWT 密钥
2. 生产环境禁用 test-auth.controller
3. 实现认证接口速率限制
4. 修复 DTO 类型安全问题

**中优先级 (稳定性):**
1. 统一错误处理模式
2. 添加 parseInt 错误处理
3. 实现事件通知逻辑

**低优先级 (可维护性):**
1. 移除生产环境 console.log
2. 消除代码中的 TODO
3. 添加更完整的单元测试
