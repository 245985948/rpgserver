/**
 * 应用基础配置
 */

export default () => ({
  // 服务端口
  port: parseInt(process.env.PORT, 10) || 3000,

  // 环境
  nodeEnv: process.env.NODE_ENV || 'development',

  // 应用名称
  name: '太墟修仙录服务端',

  // 版本
  version: process.env.APP_VERSION || '1.0.0',

  // 日志级别
  logLevel: process.env.LOG_LEVEL || 'debug',

  // 请求超时(毫秒)
  requestTimeout: 30000,
});
