/**
 * 游戏协议定义
 * 客户端 (Cocos Creator) 和服务器 (NestJS) 共用
 *
 * 使用方式:
 * 1. Git Submodule: 将本目录作为子模块引入客户端项目
 * 2. 软链接: 在客户端创建软链接指向本目录
 * 3. 复制: 构建时自动复制到客户端
 */

// 消息号定义
export * from './message-codes';

// 类型定义 (双方共用的接口)
export * from './types';
