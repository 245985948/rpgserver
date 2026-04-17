/**
 * 配置模块导出
 */

import appConfig from './app.config';
import databaseConfig from './database.config';
import redisConfig from './redis.config';
import gameConfig from './game.config';

export const configurations = [
  appConfig,
  databaseConfig,
  redisConfig,
  gameConfig,
];

export * from './app.config';
export * from './database.config';
export * from './redis.config';
export * from './game.config';
