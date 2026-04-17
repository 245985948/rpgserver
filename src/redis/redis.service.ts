/**
 * Redis服务
 * 提供缓存操作和分布式锁功能
 */

import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(private readonly redis: Redis) {}

  // ============================================
  // 基础缓存操作
  // ============================================

  /**
   * 设置字符串值
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  /**
   * 获取字符串值
   */
  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  /**
   * 删除键
   */
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds);
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  // ============================================
  // JSON缓存操作
  // ============================================

  /**
   * 设置JSON对象
   */
  async setJson<T>(key: string, value: T, ttl?: number): Promise<void> {
    const json = JSON.stringify(value);
    await this.set(key, json, ttl);
  }

  /**
   * 获取JSON对象
   */
  async getJson<T>(key: string): Promise<T | null> {
    const json = await this.get(key);
    if (!json) return null;
    try {
      return JSON.parse(json) as T;
    } catch {
      return null;
    }
  }

  // ============================================
  // 哈希表操作
  // ============================================

  /**
   * 设置哈希字段
   */
  async hset(key: string, field: string, value: string): Promise<void> {
    await this.redis.hset(key, field, value);
  }

  /**
   * 获取哈希字段
   */
  async hget(key: string, field: string): Promise<string | null> {
    return this.redis.hget(key, field);
  }

  /**
   * 获取整个哈希表
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    return this.redis.hgetall(key);
  }

  /**
   * 删除哈希字段
   */
  async hdel(key: string, field: string): Promise<void> {
    await this.redis.hdel(key, field);
  }

  // ============================================
  // 列表操作
  // ============================================

  /**
   * 列表左侧推入
   */
  async lpush(key: string, value: string): Promise<void> {
    await this.redis.lpush(key, value);
  }

  /**
   * 列表右侧推入
   */
  async rpush(key: string, value: string): Promise<void> {
    await this.redis.rpush(key, value);
  }

  /**
   * 列表左侧弹出
   */
  async lpop(key: string): Promise<string | null> {
    return this.redis.lpop(key);
  }

  /**
   * 获取列表范围
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.redis.lrange(key, start, stop);
  }

  // ============================================
  // 有序集合操作(用于排行榜)
  // ============================================

  /**
   * 添加有序集合成员
   */
  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.redis.zadd(key, score, member);
  }

  /**
   * 获取有序集合排名
   */
  async zrank(key: string, member: string): Promise<number | null> {
    return this.redis.zrank(key, member);
  }

  /**
   * 获取有序集合分数
   */
  async zscore(key: string, member: string): Promise<string | null> {
    return this.redis.zscore(key, member);
  }

  /**
   * 获取有序集合范围(按排名)
   */
  async zrange(
    key: string,
    start: number,
    stop: number,
    withScores = false,
  ): Promise<string[]> {
    if (withScores) {
      return this.redis.zrange(key, start, stop, 'WITHSCORES');
    }
    return this.redis.zrange(key, start, stop);
  }

  /**
   * 移除有序集合成员
   */
  async zrem(key: string, member: string): Promise<void> {
    await this.redis.zrem(key, member);
  }

  // ============================================
  // 分布式锁
  // ============================================

  /**
   * 获取分布式锁
   * @param lockKey 锁的键
   * @param lockValue 锁的值(用于验证所有权)
   * @param ttl 锁过期时间(秒)
   * @returns 是否获取成功
   */
  async acquireLock(
    lockKey: string,
    lockValue: string,
    ttl: number = 30,
  ): Promise<boolean> {
    const result = await this.redis.setnx(lockKey, lockValue);
    if (result === 1) {
      await this.redis.expire(lockKey, ttl);
      return true;
    }
    return false;
  }

  /**
   * 释放分布式锁
   * @param lockKey 锁的键
   * @param lockValue 锁的值(验证所有权)
   * @returns 是否释放成功
   */
  async releaseLock(lockKey: string, lockValue: string): Promise<boolean> {
    const currentValue = await this.redis.get(lockKey);
    if (currentValue === lockValue) {
      await this.redis.del(lockKey);
      return true;
    }
    return false;
  }

  /**
   * 延长锁时间
   */
  async extendLock(lockKey: string, lockValue: string, ttl: number): Promise<boolean> {
    const currentValue = await this.redis.get(lockKey);
    if (currentValue === lockValue) {
      await this.redis.expire(lockKey, ttl);
      return true;
    }
    return false;
  }

  // ============================================
  // 批量操作
  // ============================================

  /**
   * 批量获取
   */
  async mget(keys: string[]): Promise<(string | null)[]> {
    return this.redis.mget(keys);
  }

  /**
   * 批量设置
   */
  async mset(entries: Record<string, string>): Promise<void> {
    const pairs = Object.entries(entries).flat();
    await this.redis.mset(pairs);
  }

  // ============================================
  // 发布订阅(可选)
  // ============================================

  /**
   * 发布消息
   */
  async publish(channel: string, message: string): Promise<void> {
    await this.redis.publish(channel, message);
  }

  /**
   * 获取Redis实例(用于高级操作)
   */
  getClient(): Redis {
    return this.redis;
  }
}
