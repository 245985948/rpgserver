# 太墟修仙录服务端 - 完整运行教程

## 目录
1. [环境要求](#环境要求)
2. [安装步骤](#安装步骤)
3. [配置说明](#配置说明)
4. [启动项目](#启动项目)
5. [验证运行](#验证运行)
6. [常见问题](#常见问题)

---

## 环境要求

### 必须安装

| 软件 | 版本 | 下载链接 |
|------|------|----------|
| Node.js | 18.x 或 20.x | https://nodejs.org/ |
| MongoDB | 6.x+ | https://www.mongodb.com/try/download/community |
| Redis | 7.x+ | https://redis.io/download |

### 可选但推荐

| 软件 | 用途 |
|------|------|
| Git | 版本控制 |
| VS Code | 代码编辑 |
| MongoDB Compass | 数据库可视化 |
| Redis Insight | Redis可视化 |

---

## 安装步骤

### 第一步：安装 Node.js

1. 访问 https://nodejs.org/
2. 下载 LTS 版本 (推荐 20.x)
3. 运行安装程序，一路点击"下一步"
4. 打开命令行，验证安装：

```bash
node --version    # 应该显示 v20.x.x
npm --version     # 应该显示 10.x.x
```

### 第二步：安装 MongoDB

#### Windows

1. 下载 MongoDB Community Server
2. 运行安装程序，选择"Complete"安装
3. 安装 MongoDB Compass (可视化工具)
4. 启动 MongoDB 服务：

```bash
# 手动启动
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath="C:\data\db"

# 或者使用服务方式
net start MongoDB
```

#### Mac

```bash
# 使用 Homebrew 安装
brew tap mongodb/brew
brew install mongodb-community

# 启动服务
brew services start mongodb-community
```

#### Linux (Ubuntu)

```bash
# 安装
sudo apt update
sudo apt install mongodb

# 启动服务
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**验证 MongoDB**：
```bash
mongosh
> show dbs
```

### 第三步：安装 Redis

#### Windows

1. 下载 Redis for Windows: https://github.com/tporadowski/redis/releases
2. 解压到 C:\Redis
3. 启动 Redis:

```bash
C:\Redis\redis-server.exe
```

#### Mac

```bash
brew install redis
brew services start redis
```

#### Linux

```bash
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**验证 Redis**：
```bash
redis-cli ping
# 应该返回 PONG
```

---

## 配置说明

### 1. 创建环境配置文件

在项目根目录创建 `.env` 文件：

```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

### 2. 编辑 .env 文件

```env
# ============================================
# 太墟修仙录服务端环境配置
# ============================================

# 应用配置
NODE_ENV=development
PORT=3000
APP_VERSION=1.0.0
LOG_LEVEL=debug

# MongoDB配置 (根据你的安装修改)
# 本地安装默认使用:
MONGODB_URI=mongodb://localhost:27017/taixu

# 如果有用户名密码:
# MONGODB_URI=mongodb://username:password@localhost:27017/taixu

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=          # 如果没有密码留空
REDIS_DB=0

# 微信小游戏配置 (正式部署时需要)
WECHAT_APP_ID=your_app_id_here
WECHAT_APP_SECRET=your_app_secret_here
```

---

## 启动项目

### 第一步：安装项目依赖

在项目根目录打开命令行：

```bash
cd D:\rpgServers    # 进入项目目录
npm install         # 安装所有依赖
```

安装过程可能需要几分钟，请耐心等待。

### 第二步：启动数据库服务

确保 MongoDB 和 Redis 都在运行：

```bash
# Windows - 检查服务状态
net start | findstr MongoDB
net start | findstr Redis

# 如果没有运行，手动启动
# MongoDB
mongod

# Redis (新开一个命令行窗口)
redis-server
```

### 第三步：启动服务端

#### 开发模式 (推荐，支持热重载)

```bash
npm run start:dev
```

你会看到类似以下的输出：

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║     太墟修仙录服务端 (TaiXu Server)                        ║
║                                                            ║
║     环境: development                                      ║
║     版本: 1.0.0                                            ║
║     端口: 3000                                             ║
║                                                            ║
║     HTTP:   http://localhost:3000/api                      ║
║     Health: http://localhost:3000/api/health               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

#### 生产模式

```bash
# 先编译
npm run build

# 再运行
npm run start:prod
```

---

## 验证运行

### 1. 健康检查

打开浏览器或使用 curl 访问：

```bash
curl http://localhost:3000/api/health
```

预期返回：
```json
{
  "status": "healthy",
  "database": true,
  "redis": true,
  "timestamp": 1709000000000,
  "version": "1.0.0",
  "environment": "development"
}
```

### 2. 详细状态

```bash
curl http://localhost:3000/api/health/details
```

### 3. 测试登录接口

```bash
# 测试微信登录 (模拟)
curl -X POST http://localhost:3000/api/auth/wechat-login \
  -H "Content-Type: application/json" \
  -d '{"code": "test_code_123"}'
```

### 4. 使用 API 测试工具

推荐使用以下工具测试 API：

- **Postman**: https://www.postman.com/
- **Insomnia**: https://insomnia.rest/
- **Hoppscotch** (在线): https://hoppscotch.io/

---

## 常用命令

```bash
# 开发模式 (热重载)
npm run start:dev

# 编译项目
npm run build

# 生产模式
npm run start:prod

# 运行测试
npm test

# 测试覆盖率
npm run test:cov

# 代码检查
npm run lint
```

---

## 常见问题

### Q1: 启动时报 "Cannot find module"

**原因**: 依赖没有正确安装

**解决**:
```bash
# 删除 node_modules 重新安装
rm -rf node_modules          # Mac/Linux
rmdir /s /q node_modules     # Windows

npm install
```

### Q2: MongoDB 连接失败

**错误信息**: `MongooseServerSelectionError: connect ECONNREFUSED`

**解决**:
1. 检查 MongoDB 是否运行: `mongosh`
2. 检查连接字符串是否正确
3. Windows 用户确保已创建数据目录:
   ```bash
   mkdir C:\data\db
   ```

### Q3: Redis 连接失败

**错误信息**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**解决**:
1. 检查 Redis 是否运行: `redis-cli ping`
2. 如果 Redis 在其他端口运行，修改 `.env` 文件

### Q4: 端口被占用

**错误信息**: `EADDRINUSE: address already in use :::3000`

**解决**:
```bash
# 查找占用 3000 端口的进程 (Windows)
netstat -ano | findstr :3000
taskkill /PID <进程ID> /F

# Mac/Linux
lsof -i :3000
kill -9 <进程ID>

# 或者修改 .env 使用其他端口
PORT=3001
```

### Q5: TypeScript 编译错误

**解决**:
```bash
# 检查 TypeScript 版本
npx tsc --version

# 重新编译
npm run build
```

### Q6: 微信登录报错

**说明**: 开发环境下微信登录使用模拟数据，不会真正调用微信 API

**正式部署时**: 需要填写 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET`

---

## 项目结构速查

```
rpgServers/
├── src/
│   ├── modules/        # 业务模块
│   │   ├── auth/       # 登录认证
│   │   ├── player/     # 玩家数据
│   │   ├── offline/    # 离线收益
│   │   ├── battle/     # 战斗系统
│   │   ├── estate/     # 仙府系统
│   │   └── market/     # 坊市交易
│   ├── database/       # 数据库模型
│   ├── redis/          # Redis服务
│   └── shared/         # 公共代码
├── .env                # 环境变量 (你需要创建)
└── package.json        # 项目配置
```

---

## 下一步

1. 服务端运行后，可以对接微信小游戏客户端
2. 参考 `EXTENSION.md` 添加新功能
3. 阅读 `README.md` 了解项目架构

---

## 需要帮助？

- 查看项目 `README.md` 了解架构设计
- 查看 `EXTENSION.md` 了解如何扩展功能
- 检查日志文件排查问题
