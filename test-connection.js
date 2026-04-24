/**
 * Socket.IO 连接测试脚本
 * 用于诊断 WebSocket 连接问题
 */

const { io } = require('socket.io-client');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000/game';

console.log('═══════════════════════════════════════════════════════');
console.log('  Socket.IO 连接测试工具');
console.log('═══════════════════════════════════════════════════════');
console.log(`  连接地址: ${SERVER_URL}`);
console.log('═══════════════════════════════════════════════════════\n');

// 创建 Socket.IO 连接
const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  timeout: 10000,
  reconnection: false,
});

// 连接成功
socket.on('connect', () => {
  console.log('✅ 连接成功!');
  console.log(`   Socket ID: ${socket.id}`);
  console.log(`   Transport: ${socket.io.engine.transport.name}`);
  console.log('');
});

// 连接断开
socket.on('disconnect', (reason) => {
  console.log(`❌ 连接断开: ${reason}`);
  process.exit(0);
});

// 连接错误
socket.on('connect_error', (error) => {
  console.log('❌ 连接错误:');
  console.log(`   消息: ${error.message}`);
  console.log(`   描述: ${error.description || 'N/A'}`);
  console.log(`   类型: ${error.type || 'N/A'}`);
  console.log('');
  console.log('可能的原因:');
  console.log('  1. 服务器未启动');
  console.log('  2. 服务器地址错误');
  console.log('  3. 命名空间错误');
  console.log('  4. CORS 跨域限制');
  console.log('  5. 防火墙阻止');
  console.log('');
  process.exit(1);
});

// 服务器确认连接
socket.on('connected', (data) => {
  console.log('✅ 服务器确认连接:');
  console.log(`   数据: ${JSON.stringify(data, null, 2)}`);
  console.log('');

  // 发送测试消息
  setTimeout(() => {
    console.log('📤 发送测试消息: GET_PLAYER_DATA_REQ (code=2000)');
    socket.emit('message', {
      code: 2000,
      seq: 1,
      payload: {},
      timestamp: Date.now()
    });
  }, 1000);
});

// 接收消息响应
socket.on('message', (data) => {
  console.log('📥 收到消息响应:');
  console.log(`   数据: ${JSON.stringify(data, null, 2)}`);
  console.log('');

  // 断开连接
  setTimeout(() => {
    console.log('断开连接...');
    socket.disconnect();
  }, 1000);
});

// 超时处理
setTimeout(() => {
  console.log('❌ 连接超时 (10秒)');
  console.log('可能服务器没有正确响应');
  socket.disconnect();
  process.exit(1);
}, 10000);

console.log('正在连接...\n');
