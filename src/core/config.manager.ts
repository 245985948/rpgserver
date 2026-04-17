/**
 * 配置管理器
 * 提供内存中的只读配置表访问
 * 支持热重载配置
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 配置表接口
 */
export interface IConfigTable<T = unknown> {
  [id: string]: T;
}

@Injectable()
export class ConfigManager implements OnModuleInit {
  private readonly logger = new Logger(ConfigManager.name);
  private readonly configCache = new Map<string, IConfigTable>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.loadAllConfigs();
  }

  /**
   * 加载所有配置表
   * 可由子类或扩展点重写以加载实际配置
   */
  private async loadAllConfigs(): Promise<void> {
    // 配置表加载占位符
    // 实际项目中这里会从JSON文件、数据库或配置中心加载
    this.logger.log('Loading configuration tables...');

    // 示例:初始化空配置表
    this.configCache.set('items', {});
    this.configCache.set('skills', {});
    this.configCache.set('realms', {});
    this.configCache.set('buildings', {});
    this.configCache.set('dungeons', {});

    this.logger.log(`Loaded ${this.configCache.size} config tables`);
  }

  /**
   * 获取配置表
   */
  getTable<T>(name: string): IConfigTable<T> | undefined {
    return this.configCache.get(name) as IConfigTable<T> | undefined;
  }

  /**
   * 获取配置项
   */
  get<T>(tableName: string, id: string): T | undefined {
    const table = this.configCache.get(tableName);
    return table?.[id] as T | undefined;
  }

  /**
   * 重新加载配置表
   */
  async reloadTable(name: string, data: IConfigTable): Promise<void> {
    this.configCache.set(name, data);
    this.logger.log(`Reloaded config table: ${name}`);
  }

  /**
   * 获取所有配置表名称
   */
  getTableNames(): string[] {
    return Array.from(this.configCache.keys());
  }

  /**
   * 检查配置表是否存在
   */
  hasTable(name: string): boolean {
    return this.configCache.has(name);
  }

  /**
   * 获取应用配置
   */
  getAppConfig(): any {
    return {
      port: this.configService.get<number>('port'),
      nodeEnv: this.configService.get<string>('nodeEnv'),
      version: this.configService.get<string>('version'),
    };
  }

  /**
   * 获取游戏配置
   */
  getGameConfig(): any {
    return this.configService.get('offline');
  }
}
