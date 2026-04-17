/**
 * 数据库配置
 */

export default () => ({
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/taixu',
    options: {
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },
});
