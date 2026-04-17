/**
 * 环境检查脚本
 * 运行: node check-env.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function check(command, name) {
  try {
    const result = execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { ok: true, version: result.trim() };
  } catch {
    return { ok: false };
  }
}

function printHeader() {
  log('');
  log('╔═══════════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                           ║', 'cyan');
  log('║        太墟修仙录服务端 - 环境检查工具                    ║', 'cyan');
  log('║                                                           ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════╝', 'cyan');
  log('');
}

function printSection(title) {
  log(`\n[${title}]`, 'blue');
  log('─'.repeat(50));
}

async function main() {
  printHeader();

  let allOk = true;

  // 检查 Node.js
  printSection('Node.js');
  const nodeCheck = check('node --version', 'Node.js');
  if (nodeCheck.ok) {
    const version = nodeCheck.version;
    const major = parseInt(version.split('.')[0].replace('v', ''));
    if (major >= 18) {
      log(`✓ Node.js ${version} (符合要求 >= 18.x)`, 'green');
    } else {
      log(`✗ Node.js ${version} (需要 >= 18.x)`, 'red');
      allOk = false;
    }
  } else {
    log('✗ Node.js 未安装', 'red');
    log('  下载地址: https://nodejs.org/', 'yellow');
    allOk = false;
  }

  // 检查 npm
  printSection('npm');
  const npmCheck = check('npm --version', 'npm');
  if (npmCheck.ok) {
    log(`✓ npm ${npmCheck.version}`, 'green');
  } else {
    log('✗ npm 未安装', 'red');
    allOk = false;
  }

  // 检查项目依赖
  printSection('项目依赖');
  if (fs.existsSync(path.join(__dirname, 'node_modules'))) {
    log('✓ node_modules 已存在', 'green');
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
      const deps = Object.keys(pkg.dependencies || {});
      log(`  已安装 ${deps.length} 个主要依赖`);
    } catch {
      log('  无法读取 package.json');
    }
  } else {
    log('✗ node_modules 不存在', 'red');
    log('  请运行: npm install', 'yellow');
    allOk = false;
  }

  // 检查 .env 文件
  printSection('配置文件');
  if (fs.existsSync(path.join(__dirname, '.env'))) {
    log('✓ .env 配置文件已存在', 'green');
  } else {
    log('⚠ .env 配置文件不存在', 'yellow');
    log('  请运行: copy .env.example .env', 'yellow');
    log('  然后编辑 .env 配置数据库连接');
  }

  // 检查 MongoDB (尝试连接)
  printSection('MongoDB');
  try {
    const mongoose = require('mongoose');
    await mongoose.connect('mongodb://localhost:27017/taixu', {
      serverSelectionTimeoutMS: 3000,
    });
    log('✓ MongoDB 连接成功', 'green');
    log(`  数据库: ${mongoose.connection.name}`);
    await mongoose.disconnect();
  } catch (err) {
    log('✗ MongoDB 连接失败', 'red');
    log(`  错误: ${err.message}`, 'yellow');
    log('  请确保 MongoDB 已启动: mongod', 'yellow');
    allOk = false;
  }

  // 检查 Redis (尝试连接)
  printSection('Redis');
  try {
    const Redis = require('ioredis');
    const redis = new Redis({
      host: 'localhost',
      port: 6379,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
    });
    await redis.ping();
    log('✓ Redis 连接成功', 'green');
    await redis.quit();
  } catch (err) {
    log('✗ Redis 连接失败', 'red');
    log(`  错误: ${err.message}`, 'yellow');
    log('  请确保 Redis 已启动: redis-server', 'yellow');
    allOk = false;
  }

  // 总结
  log('');
  log('═'.repeat(59), 'cyan');
  if (allOk) {
    log('✓ 所有检查通过，可以启动服务端', 'green');
    log('');
    log('启动命令:', 'blue');
    log('  npm run start:dev    (开发模式)');
    log('  npm run build        (生产编译)');
    log('  npm run start:prod   (生产模式)');
  } else {
    log('✗ 部分检查未通过，请修复后再启动', 'red');
  }
  log('═'.repeat(59), 'cyan');
  log('');

  process.exit(allOk ? 0 : 1);
}

main().catch(console.error);
